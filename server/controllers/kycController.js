const db = require('../db/db');
const { z } = require('zod');
const { logAudit } = require('../utils/auditLogger');
const { sendKYCApprovalEmail, sendKYCRejectionEmail } = require('../utils/emailService');

const docTypeEnum = z.enum([
  'DrivingLicense_Front',
  'DrivingLicense_Back',
  'Aadhaar_Front',
  'Aadhaar_Back',
  'PAN',
  'Selfie'
]);

const uploadDocSchema = z.object({
  doc_type: docTypeEnum,
  doc_number: z.string().optional().nullable(),
  file_path: z.string().min(1, 'File path is required'),
  expiry_date: z.string().optional().nullable(),
  dob: z.string().optional().nullable() // Date of birth validation
});

/**
 * POST /api/kyc/submit-document
 * Uploads/Registers a KYC document for the logged in user
 */
function submitKYCDocument(req, res, next) {
  try {
    const data = uploadDocSchema.parse(req.body);
    const userId = req.user.user_id;

    // Validate Driving License expiry: must be future date
    if (data.doc_type.startsWith('DrivingLicense') && data.expiry_date) {
      const expDate = new Date(data.expiry_date);
      if (expDate <= new Date()) {
        return res.status(400).json({ error: 'Driving License expiry date must be in the future.' });
      }
    }

    // Duplicate document check: Ensure document number isn't registered to another user
    if (data.doc_number && data.doc_number.trim().length > 3) {
      const cleanDocNum = data.doc_number.trim().toUpperCase();
      const duplicate = db.prepare(`
        SELECT kd.doc_id, u.email
        FROM kyc_documents kd
        JOIN users u ON kd.user_id = u.user_id
        WHERE UPPER(kd.doc_number) = ? AND kd.user_id != ? AND kd.status != 'Rejected'
        LIMIT 1
      `).get(cleanDocNum, userId);

      if (duplicate) {
        return res.status(409).json({
          error: `This document number (${data.doc_number}) is already registered with another account.`
        });
      }
    }

    const tx = db.transaction(() => {
      // Check if user already submitted this doc_type
      const existing = db.prepare(`
        SELECT doc_id FROM kyc_documents WHERE user_id = ? AND doc_type = ?
      `).get(userId, data.doc_type);

      let docId;
      if (existing) {
        db.prepare(`
          UPDATE kyc_documents
          SET doc_number = COALESCE(?, doc_number),
              file_path = ?,
              expiry_date = COALESCE(?, expiry_date),
              status = 'Pending',
              rejection_reason = NULL,
              uploaded_at = datetime('now')
          WHERE doc_id = ?
        `).run(
          data.doc_number ? data.doc_number.trim().toUpperCase() : null,
          data.file_path,
          data.expiry_date || null,
          existing.doc_id
        );
        docId = existing.doc_id;
      } else {
        const result = db.prepare(`
          INSERT INTO kyc_documents (user_id, doc_type, doc_number, file_path, expiry_date, status, uploaded_at)
          VALUES (?, ?, ?, ?, ?, 'Pending', datetime('now'))
        `).run(
          userId,
          data.doc_type,
          data.doc_number ? data.doc_number.trim().toUpperCase() : null,
          data.file_path,
          data.expiry_date || null
        );
        docId = result.lastInsertRowid;
      }

      // Update user KYC status to Pending
      db.prepare(`
        UPDATE users
        SET kyc_status = 'Pending', kyc_rejection_reason = NULL
        WHERE user_id = ?
      `).run(userId);

      logAudit(userId, 'SUBMIT_KYC_DOCUMENT', 'kyc_documents', docId, {
        doc_type: data.doc_type,
        doc_number: data.doc_number ? '***' + data.doc_number.slice(-4) : null
      });

      return docId;
    });

    const docId = tx();

    const updatedDoc = db.prepare('SELECT * FROM kyc_documents WHERE doc_id = ?').get(docId);
    res.status(201).json({
      message: `${data.doc_type} submitted successfully for verification.`,
      document: updatedDoc
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/kyc/status
 * Get KYC status & document list for current logged-in user
 */
function getMyKYCStatus(req, res, next) {
  try {
    const userId = req.user.user_id;
    const user = db.prepare('SELECT user_id, name, email, role, kyc_status, kyc_rejection_reason FROM users WHERE user_id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const documents = db.prepare(`
      SELECT doc_id, doc_type, doc_number, file_path, expiry_date, status, rejection_reason, uploaded_at, reviewed_at
      FROM kyc_documents
      WHERE user_id = ?
      ORDER BY uploaded_at DESC
    `).all(userId);

    // Mask doc numbers for security (e.g. XXXX-XXXX-1234)
    const maskedDocs = documents.map(d => ({
      ...d,
      masked_number: d.doc_number ? '•••• ' + d.doc_number.slice(-4) : null
    }));

    res.json({
      kyc_status: user.kyc_status || 'NotSubmitted',
      kyc_rejection_reason: user.kyc_rejection_reason || null,
      documents: maskedDocs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/kyc/admin/all (Admin only)
 * List all users with KYC documents, filterable by role & status
 */
function getAdminKYCList(req, res, next) {
  try {
    const { status, role, search } = req.query;

    let query = `
      SELECT u.user_id, u.name, u.email, u.phone, u.role, u.kyc_status, u.kyc_rejection_reason, u.created_at,
             COUNT(kd.doc_id) AS total_docs,
             SUM(CASE WHEN kd.status = 'Pending' THEN 1 ELSE 0 END) AS pending_docs,
             SUM(CASE WHEN kd.status = 'Approved' THEN 1 ELSE 0 END) AS approved_docs,
             SUM(CASE WHEN kd.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_docs
      FROM users u
      LEFT JOIN kyc_documents kd ON u.user_id = kd.user_id
      WHERE u.deleted_at IS NULL
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND u.kyc_status = ?`;
      params.push(status);
    }

    if (role && role !== 'all') {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY u.user_id ORDER BY CASE WHEN u.kyc_status = 'Pending' THEN 1 WHEN u.kyc_status = 'Rejected' THEN 2 ELSE 3 END, u.created_at DESC`;

    const users = db.prepare(query).all(...params);

    // Attach documents for each user
    const usersWithDocs = users.map(u => {
      const docs = db.prepare(`
        SELECT doc_id, doc_type, doc_number, file_path, expiry_date, status, rejection_reason, uploaded_at, reviewed_at
        FROM kyc_documents
        WHERE user_id = ?
        ORDER BY uploaded_at DESC
      `).all(u.user_id);
      return { ...u, documents: docs };
    });

    res.json(usersWithDocs);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/kyc/admin/verify-doc/:docId (Admin only)
 * Approve or Reject individual document
 */
function verifyKYCDocument(req, res, next) {
  try {
    const { docId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.user_id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
    }

    if (status === 'Rejected' && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({ error: 'A specific rejection reason is required when rejecting a document.' });
    }

    const doc = db.prepare('SELECT * FROM kyc_documents WHERE doc_id = ?').get(docId);
    if (!doc) {
      return res.status(404).json({ error: 'KYC Document not found.' });
    }

    // Admin cannot verify their own document
    if (doc.user_id === adminId) {
      return res.status(400).json({ error: 'Security restriction: Administrators cannot approve their own KYC documents.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(doc.user_id);

    const tx = db.transaction(() => {
      // 1. Update document status
      db.prepare(`
        UPDATE kyc_documents
        SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = datetime('now')
        WHERE doc_id = ?
      `).run(status, status === 'Rejected' ? reason.trim() : null, adminId, docId);

      // 2. Determine new overall user status
      let newOverallStatus = user.kyc_status;
      if (status === 'Rejected') {
        newOverallStatus = 'Rejected';
        db.prepare(`
          UPDATE users
          SET kyc_status = 'Rejected', kyc_rejection_reason = ?
          WHERE user_id = ?
        `).run(reason.trim(), doc.user_id);
      } else {
        // If approved, check if any documents remain pending or rejected
        const pendingCount = db.prepare(`
          SELECT COUNT(*) as count FROM kyc_documents WHERE user_id = ? AND status != 'Approved'
        `).get(doc.user_id).count;

        if (pendingCount === 0) {
          newOverallStatus = 'Approved';
          db.prepare(`
            UPDATE users
            SET kyc_status = 'Approved', kyc_rejection_reason = NULL
            WHERE user_id = ?
          `).run(doc.user_id);
        }
      }

      logAudit(adminId, `VERIFY_KYC_${status.toUpperCase()}`, 'kyc_documents', docId, {
        target_user_id: doc.user_id,
        doc_type: doc.doc_type,
        status,
        reason: reason || null
      });

      return newOverallStatus;
    });

    const overallStatus = tx();

    // Send email notification asynchronously
    if (status === 'Approved' && overallStatus === 'Approved') {
      sendKYCApprovalEmail(user.email, user.name).catch(() => {});
    } else if (status === 'Rejected') {
      sendKYCRejectionEmail(user.email, user.name, reason).catch(() => {});
    }

    res.json({
      message: `Document ${status.toLowerCase()} successfully.`,
      doc_id: docId,
      status,
      overall_kyc_status: overallStatus
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/kyc/admin/user/:userId/status (Admin only)
 * Approve or Reject user's complete KYC profile directly
 */
function verifyUserKYC(req, res, next) {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.user_id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
    }

    if (status === 'Rejected' && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({ error: 'A specific rejection reason is required when rejecting KYC.' });
    }

    if (Number(userId) === adminId) {
      return res.status(400).json({ error: 'Security restriction: Administrators cannot approve their own KYC.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const tx = db.transaction(() => {
      // Update all documents for this user
      db.prepare(`
        UPDATE kyc_documents
        SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = datetime('now')
        WHERE user_id = ?
      `).run(status, status === 'Rejected' ? reason.trim() : null, adminId, userId);

      // Update user kyc_status
      db.prepare(`
        UPDATE users
        SET kyc_status = ?, kyc_rejection_reason = ?
        WHERE user_id = ?
      `).run(status, status === 'Rejected' ? reason.trim() : null, userId);

      logAudit(adminId, `USER_KYC_${status.toUpperCase()}`, 'users', userId, {
        status,
        reason: reason || null
      });
    });

    tx();

    if (status === 'Approved') {
      sendKYCApprovalEmail(user.email, user.name).catch(() => {});
    } else {
      sendKYCRejectionEmail(user.email, user.name, reason).catch(() => {});
    }

    res.json({
      message: `User KYC marked as ${status}.`,
      user_id: userId,
      kyc_status: status
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitKYCDocument,
  getMyKYCStatus,
  getAdminKYCList,
  verifyKYCDocument,
  verifyUserKYC
};
