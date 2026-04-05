require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const db = require('./database');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3001;
const API_KEY = 'LanevoxAdmin2026';

// ── Resend email client ─────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Helper: build notification email ────────────────────────────────────────
function buildEmailHTML(data) {
  const services = (data.services || '').split(',').filter(Boolean);
  const servicePills = services
    .map(s => `<span style="display:inline-block;background:#0A1628;color:#F4F3EF;border-radius:20px;padding:4px 14px;font-size:12px;margin:3px 3px 3px 0;font-family:'DM Sans',Arial,sans-serif;">${s.trim()}</span>`)
    .join('');

  const row = (label, value) => value
    ? `<tr><td style="padding:8px 12px;font-weight:600;color:#5A5A58;font-size:13px;white-space:nowrap;width:180px;">${label}</td><td style="padding:8px 12px;color:#0A0A0A;font-size:13px;">${value}</td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F3EF;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;">
    <!-- Header -->
    <div style="background:#0A1628;padding:32px 40px;text-align:center;">
      <svg width="32" height="32" viewBox="0 0 100 100" style="vertical-align:middle;margin-right:10px;" fill="#F4F3EF">
        <polygon points="50.00,4.00 57.52,29.33 79.57,14.76 69.05,39.00 95.30,42.01 71.67,53.82 89.84,73.00 64.14,66.85 65.73,93.23 50.00,72.00 34.27,93.23 35.86,66.85 10.16,73.00 28.33,53.82 4.70,42.01 30.95,39.00 20.43,14.76 42.48,29.33"/>
      </svg>
      <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#F4F3EF;letter-spacing:0.15em;">LNVX</span>
      <div style="color:#9A9A97;font-size:12px;margin-top:6px;letter-spacing:0.1em;text-transform:uppercase;">New Client Submission</div>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:40px;">
      <h2 style="margin:0 0 4px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#0A1628;">${data.business_name}</h2>
      <p style="margin:0 0 24px;color:#5A5A58;font-size:14px;">${new Date().toLocaleDateString('en-AU', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>

      <!-- Quick contact -->
      <div style="background:#F4F3EF;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:16px;color:#0A0A0A;margin-bottom:6px;"><strong>${data.contact_name}</strong></div>
        <div style="margin-bottom:4px;"><a href="tel:${data.phone}" style="color:#0A1628;text-decoration:none;font-size:14px;">📞 ${data.phone}</a></div>
        <div><a href="mailto:${data.email}" style="color:#0A1628;text-decoration:none;font-size:14px;">✉️ ${data.email}</a></div>
      </div>

      <!-- Services -->
      <div style="margin-bottom:28px;">
        <div style="font-size:12px;font-weight:600;color:#5A5A58;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;">Services Selected</div>
        <div>${servicePills || '<span style="color:#9A9A97;font-size:13px;">None selected</span>'}</div>
      </div>

      <!-- All fields -->
      <table style="width:100%;border-collapse:collapse;background:#F4F3EF;border-radius:10px;overflow:hidden;">
        ${row('Industry', data.industry)}
        ${row('Address', data.address)}
        ${row('Business Description', data.description)}
        ${row('Target Customer', data.target_customer)}
        ${row('Brand Colours', data.brand_colours)}
        ${row('Brand Tone', data.brand_tone)}
        ${row('Has Logo', data.has_logo)}
        ${row('Admired Brands', data.admired_brands)}
        ${row('Current Website', data.current_website)}
        ${row('Domain Preference', data.domain_preference)}
        ${row('Facebook', data.facebook)}
        ${row('Instagram', data.instagram)}
        ${row('Goals', data.goals)}
        ${row('Competitors', data.competitors)}
        ${row('Anything Else', data.anything_else)}
      </table>

      <!-- Signature -->
      ${data.signature_image ? `
      <div style="margin-top:28px;">
        <div style="font-size:12px;font-weight:600;color:#5A5A58;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;">Client Signature</div>
        <div style="border:1px solid rgba(10,10,10,0.1);border-radius:10px;padding:16px;background:#fff;display:inline-block;">
          <img src="${data.signature_image}" style="max-width:300px;height:auto;" alt="Client Signature">
        </div>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#EEECEA;padding:20px 40px;text-align:center;color:#9A9A97;font-size:12px;">
      Reply directly to this email to contact the client — reply-to is set to their email address.
    </div>
  </div>
</body>
</html>`;
}

// ── POST /api/submit ──────────────────────────────────────────────────────────
app.post('/api/submit', (req, res) => {
  const d = req.body;

  if (!d.business_name || !d.contact_name || !d.email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (!d.agreed_to_terms) {
    return res.status(400).json({ error: 'Must agree to terms.' });
  }
  if (!d.signature_image) {
    return res.status(400).json({ error: 'Signature is required.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO submissions (
        business_name, industry, contact_name, phone, email, address,
        description, target_customer, brand_colours, brand_tone, has_logo,
        admired_brands, current_website, domain_preference, facebook, instagram,
        goals, competitors, services, anything_else, signature_image, agreed_to_terms
      ) VALUES (
        @business_name, @industry, @contact_name, @phone, @email, @address,
        @description, @target_customer, @brand_colours, @brand_tone, @has_logo,
        @admired_brands, @current_website, @domain_preference, @facebook, @instagram,
        @goals, @competitors, @services, @anything_else, @signature_image, @agreed_to_terms
      )
    `);

    const info = stmt.run({
      business_name: d.business_name || '',
      industry: d.industry || '',
      contact_name: d.contact_name || '',
      phone: d.phone || '',
      email: d.email || '',
      address: d.address || '',
      description: d.description || '',
      target_customer: d.target_customer || '',
      brand_colours: d.brand_colours || '',
      brand_tone: d.brand_tone || '',
      has_logo: d.has_logo || '',
      admired_brands: d.admired_brands || '',
      current_website: d.current_website || '',
      domain_preference: d.domain_preference || '',
      facebook: d.facebook || '',
      instagram: d.instagram || '',
      goals: d.goals || '',
      competitors: d.competitors || '',
      services: Array.isArray(d.services) ? d.services.join(', ') : (d.services || ''),
      anything_else: d.anything_else || '',
      signature_image: d.signature_image || '',
      agreed_to_terms: d.agreed_to_terms ? 1 : 0,
    });

    // Send email notification (non-blocking)
    const services = Array.isArray(d.services) ? d.services.join(', ') : (d.services || '');
    const emailData = { ...d, services };
    resend.emails.send({
      from: 'Lanevox Onboarding <hello@lanevox.com.au>',
      to: process.env.NOTIFY_EMAIL,
      reply_to: d.email,
      subject: `New Client Submission — ${d.business_name} · ${services}`,
      html: buildEmailHTML(emailData),
    }).catch(err => console.error('Email error:', err));

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /api/submissions ──────────────────────────────────────────────────────
app.get('/api/submissions', (req, res) => {
  if (req.query.key !== API_KEY) return res.status(401).json({ error: 'Unauthorised' });
  const rows = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
  res.json(rows);
});

// ── GET /api/submissions/:id ──────────────────────────────────────────────────
app.get('/api/submissions/:id', (req, res) => {
  if (req.query.key !== API_KEY) return res.status(401).json({ error: 'Unauthorised' });
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// ── PUT /api/submissions/:id/review ──────────────────────────────────────────
app.put('/api/submissions/:id/review', (req, res) => {
  if (req.query.key !== API_KEY) return res.status(401).json({ error: 'Unauthorised' });
  db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run('reviewed', req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Lanevox Onboarding running on http://localhost:${PORT}`));
