function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Replace {{Variable}} with values; missing vars become empty for clean PDF output. */
function applyVars(str, variables) {
  if (typeof str !== 'string') return '';
  if (!variables || typeof variables !== 'object') return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    const val = variables[k.trim()];
    return (val !== undefined && val !== null && val !== '') ? String(val) : '';
  });
}

/**
 * Renders proposal (title + blocks) as HTML for the top of the document.
 * @param {Object} proposal - { title, blocks }
 * @param {Object} [variables] - Key-value for {{Variable}} substitution in blocks.
 */
function getProposalSectionHtml(proposal, variables = {}) {
  if (!proposal || (!proposal.title && !(proposal.blocks && proposal.blocks.length))) return '';
  const blocks = (proposal.blocks || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let blocksHtml = '';
  for (const b of blocks) {
    const c = b.content || {};
    if (b.type === 'heading') {
      const text = applyVars(c.text || '', variables);
      blocksHtml += `<h3 class="doc-proposal-heading">${escapeHtml(text)}</h3>`;
    } else if (b.type === 'text') {
      if (c.html) {
        const withVars = applyVars(c.html, variables);
        if (withVars) blocksHtml += `<div class="doc-proposal-html">${withVars}</div>`;
      } else {
        const text = applyVars(c.text || '', variables);
        if (text) blocksHtml += `<p class="doc-proposal-text">${escapeHtml(text)}</p>`;
      }
    } else if (b.type === 'html' && c.html) {
      blocksHtml += `<div class="doc-proposal-html">${applyVars(c.html, variables)}</div>`;
    } else if (b.type === 'content') {
      const heading = applyVars(c.heading || '', variables);
      const paragraph = applyVars(c.paragraph || '', variables);
      if (heading) blocksHtml += `<h3 class="doc-proposal-heading">${escapeHtml(heading)}</h3>`;
      if (paragraph) blocksHtml += `<p class="doc-proposal-text">${escapeHtml(paragraph)}</p>`;
    } else if (b.type === 'agreement') blocksHtml += '<p class="doc-proposal-meta">[Agreement block]</p>';
    else if (b.type === 'button' && c.label) blocksHtml += `<p class="doc-proposal-meta">${escapeHtml(applyVars(c.label, variables))}</p>`;
    else if (b.type === 'image' && c.url) blocksHtml += `<p class="doc-proposal-meta">[Image]</p>`;
    else if (b.type === 'form' && c.fields && c.fields.length) blocksHtml += '<p class="doc-proposal-meta">[Form]</p>';
    else if (b.type) blocksHtml += `<p class="doc-proposal-meta">[${escapeHtml(b.type)}]</p>`;
  }
  const title = applyVars(proposal.title || '', variables);
  return `
    <section class="doc-proposal">
      <h2 class="doc-proposal-title">Proposal / Page Content</h2>
      ${title ? `<h1 class="doc-proposal-main-title">${escapeHtml(title)}</h1>` : ''}
      <div class="doc-proposal-blocks">${blocksHtml || '<p>No content.</p>'}</div>
    </section>`;
}

/**
 * Returns full document as HTML for download or print (PDF via "Save as PDF").
 * When proposal is provided, the HTML includes Proposal/Page Content at the top, then Agreement, then Accepted By (if clientData).
 * @param {Object} [clientData] - Optional { fullName, email, organization, signatureDataUrl } to include "Accepted by" section.
 * @param {Object} [proposal] - Optional proposal { title, blocks, variables } to include page content at the top.
 * @param {Object} [opts] - Optional { forPdf: true } to omit the print hint in the body.
 */
export function getAgreementPrintHtml(clientData = null, proposal = null, opts = null) {
  const forPdf = opts && opts.forPdf === true;
  const variables = proposal && proposal.variables ? proposal.variables : {};
  const proposalSection = getProposalSectionHtml(proposal, variables);
  const acceptedSection = clientData && (clientData.fullName || clientData.email)
    ? `
    <section class="doc-accepted">
      <h2>ACCEPTED BY</h2>
      <p><strong>Name:</strong> ${escapeHtml(clientData.fullName || '')}</p>
      <p><strong>Email:</strong> ${escapeHtml(clientData.email || '')}</p>
      ${clientData.organization ? `<p><strong>Organization:</strong> ${escapeHtml(clientData.organization)}</p>` : ''}
      ${clientData.signatureDataUrl ? `<p><strong>Signature:</strong></p><p class="doc-signature-img"><img src="${clientData.signatureDataUrl}" alt="Signature" /></p>` : ''}
    </section>`
    : '';

  const agreementBody =
    (typeof proposal?.agreementTemplate === 'string' && proposal.agreementTemplate.trim() !== '')
      ? proposal.agreementTemplate.trim()
      : (typeof opts?.customAgreementBody === 'string' && opts.customAgreementBody.trim() !== ''
          ? opts.customAgreementBody.trim()
          : getDefaultAgreementBody());

  const body = `
<body>
  <div class="doc">${proposalSection}
    ${agreementBody}
    ${acceptedSection}
  </div>
  ${forPdf ? '' : '<p class="print-hint">To save as PDF: choose &quot;Save as PDF&quot; or &quot;Microsoft Print to PDF&quot; as the destination, then click Save.</p>'}
</body>`;
  const style = `
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, serif; padding: 32px 40px; margin: 0; font-size: 14px; line-height: 1.6; color: #1f1f1f; max-width: 900px; margin: 0 auto; }
    .doc { text-align: justify; }
    .doc h1 { font-size: 22px; margin: 0 0 20px 0; text-align: center; }
    .doc h2 { font-size: 18px; margin: 22px 0 10px; font-weight: 600; text-align: left; }
    .doc h3 { font-size: 14px; margin: 14px 0 6px; font-weight: 600; text-align: left; }
    .doc section { margin-bottom: 16px; }
    .doc p { margin: 0 0 10px; text-align: justify; }
    .doc table { border-collapse: collapse; width: 100%; margin: 10px 0 14px; font-size: 13px; }
    .doc th, .doc td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    .doc th { background: #f5f5f5; font-weight: 600; }
    .doc .company { font-weight: 600; margin-top: 12px; text-align: justify; }
    .doc ul, .doc ol { margin: 6px 0 12px; padding-left: 22px; }
    .doc li { margin-bottom: 4px; text-align: justify; }
    .doc .doc-proposal { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .doc .doc-proposal-title { font-size: 14px; margin: 0 0 8px 0; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    .doc .doc-proposal-main-title { font-size: 20px; margin: 0 0 16px 0; }
    .doc .doc-proposal-heading { font-size: 15px; margin: 10px 0 6px; }
    .doc .doc-proposal-text { margin: 0 0 8px; }
    .doc .doc-proposal-html { margin: 0 0 8px; }
    .doc .doc-proposal-meta { margin: 0 0 4px; font-size: 13px; color: #555; }
    .doc .doc-accepted { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; }
    .doc .doc-signature-img img { max-width: 280px; max-height: 120px; display: block; margin-top: 8px; }
    .print-hint { margin-top: 24px; font-size: 12px; color: #666; }
    .print-hint kbd { padding: 2px 6px; background: #eee; border-radius: 4px; font-size: 11px; }
    @media print { body { padding: 24px 32px; } .print-hint { display: none; } }
  </style>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Non-Disclosure Agreement</title>${style}</head>${body}</html>`;
}

/**
 * Default agreement document body (HTML string). Used when org has no custom agreementTemplate.
 * Exported for modal display and for getAgreementPrintHtml fallback.
 */
export function getDefaultAgreementBody() {
  return `
    <h1>Non-Disclosure Agreement</h1>

    <section>
      <h2>POINT OF ESCALATION</h2>
      <table>
        <thead>
          <tr><th>NAME</th><th>DESIGNATION</th><th>ROLE</th></tr>
        </thead>
        <tbody>
          <tr><td>Rahul Gupta</td><td>Business Development Manager</td><td>First Point of Escalation</td></tr>
          <tr><td>Pankaj Sakariya</td><td>Department Head (Technical Head)</td><td>Second Point of Escalation</td></tr>
          <tr><td>Chirag Rawal</td><td>COO/Director</td><td>Decision Authority</td></tr>
        </tbody>
      </table>
      <p class="company">ELSNER TECHNOLOGIES PVT. LTD</p>
      <p>For Escalation or Urgent Support in Holidays or Weekends, please send email to <strong>escalation@elsner.com</strong></p>
      <p>For any urgent support on holidays/weekends, use the word "URGENT" in the subject line in your email and send it across to the point of contact.</p>
      <p>Regarding any escalations, which needs any urgent attention, please forward the email thread and mention "escalation" in your subject line to the point of contact given in the table.</p>
    </section>

    <section>
      <h2>ASSUMPTIONS & QUERIES</h2>
      <ol><li>The entire development will be done based on the requirement discussed in these documents; any provision not part of this document may add up the additional cost for the project.</li></ol>
    </section>

    <section>
      <h2>RISKS</h2>
      <p>The following risk factors have been identified for this Project:</p>
      <ol><li><strong>Delay in starting the project:</strong> If needed credentials are delayed from the client side, it may happen that we may allocate existing resource in some other tasks/project. Reallocation of the resources is subjective to the details shared from the client side i.e. resource would be reallocated within 1 or 2 working days of the required details received from the client's end.</li></ol>
    </section>

    <section>
      <h2>EXCLUSION FROM PROJECT SCOPE</h2>
      <p>The following are not covered in the scope of this document. Elsner Technologies Pvt Ltd can provide these services at an additional cost.</p>
      <ul>
        <li>Any functionality (New Development) is not in the scope of this contract.</li>
        <li>Any Installation – Support - Communication for third-party software other than suggested by us.</li>
        <li>Hosting Services.</li>
        <li>Hardware Compatibility – Identification for Deployment platform.</li>
        <li>Backend Admin section design customization is NOT in scope for an already codebase.</li>
        <li>SSL Certificate Installations and Implementation unless specified.</li>
        <li>VAPT/ Smoke, System testing, i.e. any additional testing.</li>
        <li>Any other features, functionalities which are not included in the SOW and/or CR</li>
      </ul>
    </section>

    <section>
      <h2>TERMS AND CONDITIONS</h2>
      <h3>ASSUMPTIONS</h3>
      <ul>
        <li>We will assign a Project coordinator as a single point of contact for all communication needed with the client.</li>
        <li>Once modules are completed, Project Manager/Coordinators will seek to conduct product/deliverables verification testing for milestones/projects Sign off.</li>
        <li>We are not responsible for the development and operational performance of any Third-party partners/tools as the client selects.</li>
        <li>Performance of the application depends on the hardware selected, bandwidth allocated, data size, and concurrent users.</li>
        <li>The client will provide the developer with the necessary designs in a relevant format.</li>
        <li>Logo / Branding & Designing are not a part of the contract unless it is a part of the scope of work.</li>
        <li>The client will supply all photos, graphics, icons, and text material for the portal and websites.</li>
        <li>The client will supply all branding assets as per the need.</li>
        <li>The client will not change or alter code or configurations developed by our team until the Project is Signed off. If found so, additional cost shall be applied to rectify the same.</li>
      </ul>

      <h3>WARRANTY & NOTICE PERIOD</h3>
      <ul>
        <li>We will provide bug-fixing support for 15 days from the date of Project Delivery on the live server, which will be served for a maximum of 2 hours per day. This does not include any functional enhancement(s) not covered earlier. Helpful enhancement(s) or change(s) would be charged as per the cost of 30 EUR per hour.</li>
        <li>The client will provide a notice period of 15 working days for discontinuing the project for reasons beyond Our team provided scope or control.</li>
        <li>We towards the notice period as applicable, depending on the project duration as elaborated above.</li>
        <li>The client agrees that for two consecutive years after the termination of this Agreement, they will not directly or indirectly solicit, hire, or recommend for employment to any individual associated with Elsner Technologies Pvt Ltd.</li>
        <li>The client must not offer any payment or benefits directly to our resources. Any such action will be considered a contract breach and subject to legal action.</li>
        <li>We will expect feedback from the client within a week from the delivery of the project milestone. In case of no response from the client within a week, the project or milestone delivered would be considered as approved from the client's end.</li>
        <li>Elsner will not provide any source files/code during the development phase; in any case, if a client needs the source files/code, then they have to make the whole project payment unless specified in writing.</li>
        <li>In case the client holds the project in between of the project milestones without any prior notification, client would be liable to pay 100% amount of the project cost as the resources have already been deployed by Elsner.</li>
      </ul>

      <h3>CHANGE REQUEST PROCEDURE</h3>
      <ul>
        <li>The Project Manager/Coordinator will manage change requests.</li>
        <li>Proper analysis for the change will be performed i.e. A thorough analysis of the change and its dependencies will be conducted by the Project Leader, Project Manager, and Business Analyst to develop a Project Execution Plan.</li>
        <li>On the client's approval, the Change Request will be invoiced as per the rates finalized under the commercial contract, which is 25 EUR per hour.</li>
        <li>The Change Request could include but is not limited to: Additional functionalities to be developed like reports, functional modules, etc.; Deviation in the functional flow of the application or a particular module; Modifications to reports, screens, design, number of pages, etc.</li>
        <li>There may be other Change Request processes introduced to the project during the Project Planning and Design Phase.</li>
        <li>Change request must contain scope & commercials with both parties mutually agreeing to the same.</li>
      </ul>

      <h3>SIGN-OFF PROCESS</h3>
      <p>Upon reaching project completion and successfully completing User Acceptance Testing (UAT), We will initiate the sign-off process by presenting the client with a comprehensive sign-off document. The client shall carefully evaluate the deliverables and within a period of thirty (30) business days, provide written confirmation of their approval. In the event that the client does not respond, the shared sign-off document will be deemed as an acceptance of the project, and the client will be obligated to settle any outstanding invoices, encompassing all unpaid services rendered by Elsner Technologies Pvt Ltd, as well as expenses related to any tools, plugins, extensions, APIs, hosting services, or any third-party services for which Elsner Technologies Pvt Ltd has made payments.</p>

      <h3>PROVISION OF SERVICES</h3>
      <p>Subject to the terms and conditions of this agreement, the client hired Elsner Technologies Pvt Ltd to provide the services mentioned above to the client per the budget, timeframe, and technology agreed upon for this project. Elsner must complete all work by the completion dates specified in the applicable SOW. Elsner Technologies Pvt Ltd will not perform any services or incur any costs on behalf of the client that is not expressly mentioned in the SOW unless otherwise, the client has delivered to Elsner a purchase order for the services to be rendered and related cost under such SOW.</p>

      <h3>PAYMENT TERMS</h3>
      <ul>
        <li>If the client shall make the payments to Elsner Technologies Pvt Ltd within "a week" of the client's receipt of Elsner Technologies Pvt Ltd's invoice. Such invoice is to be submitted in a format mutually agreed upon by the parties and upon the schedule described in the applicable payment milestone section.</li>
        <li>The client must provide feedback within a week of the milestone's completion; otherwise, Elsner Technologies Pvt Ltd will consider the milestone to have been successfully delivered. Also, in this case if they delay is caused by the client to come back to us after 5 working days, it is obvious that Elsner would be waiting for their resource to resume working on the same project based on the feedback by the client. Failing so would attract a minimal cost of 30 EUR per working day by the client and this would be billed to the client.</li>
        <li>In case this delay goes into weeks or turns out as "no response" from the client side for a continuous 21 working days or more, then a one time fee of 500 EUR would be applicable to start working again on the same project.</li>
        <li>By entering into an agreement with Elsner Technologies Pvt Ltd, the client acknowledges and agrees to the non-refundable nature of the service fees.</li>
      </ul>

      <h3>SOW AMENDMENT OR TERMINATION</h3>
      <ul>
        <li>If either party wishes to amend an SOW, they must provide written notice detailing the impact on scope and financial terms. If the parties cannot agree on the changes, Elsner Technologies Pvt Ltd will either continue with the agreed-upon services, or the client may terminate the SOW with written notice.</li>
        <li>The client may terminate the services under an SOW, in whole or in part, by providing (Days) prior written notice to Elsner Technologies Pvt Ltd.</li>
        <li>If Elsner Technologies Pvt Ltd fails to deliver the agreed-upon services, client may terminate the contract by compensating Elsner Technologies Pvt Ltd for the partially completed services and for any pre-approved costs incurred up to the termination date.</li>
      </ul>

      <h3>QUALIFICATION AND REMOVAL OF COMPANY PERSONNEL</h3>
      <p>The services shall be performed by the individuals identified for this project hereto ("Key Personnels") and such other qualified and skilled Company Personnel. Upon the client's request, Elsner Technologies Pvt Ltd shall exclude from the performance of the services any company personnel who, in the client's sole discretion, is engaged in improper conduct or is not qualified to perform the Services. Elsner Technologies Pvt Ltd agrees not to replace or reassign any of its company personnel assigned to the services without the prior written consent of the client except in the case of leave of absence, disability illness, termination, or death or under other circumstances which legally requires the company to replace or reassign its company personnel assigned to the services.</p>

      <h3>INDEMNIFICATION</h3>
      <p>This indemnification clause entered into by and between parties for the project description mentioned in SOW between Elsner Technologies Pvt Ltd to the client. WHEREAS, Elsner Technologies Pvt Ltd may be exposed to certain risks and liabilities as a result of the provision of services under the Contract; WHEREAS, the client may be exposed to certain risks and liabilities as a result of its use of the services provided by Elsner Technologies Pvt Ltd under the Contract; WHEREAS, the parties desire to allocate such risks and liabilities between them through an indemnification clause of this agreement; NOW, THEREFORE, in consideration of the mutual covenants and promises contained herein, the parties agree as follows:</p>
      <ol>
        <li><strong>Indemnification by Elsner Technologies Pvt Ltd:</strong> Elsner Technologies Pvt Ltd agrees to indemnify and hold harmless the client from and against any claims, damages, losses, liabilities, costs, and expenses, including reasonable attorneys' fees, arising out of or in connection with the Elsner Technologies Pvt Ltd's performance of its obligations under the contract.</li>
        <li><strong>Indemnification by the client:</strong> The client agrees to indemnify and hold harmless Elsner Technologies Pvt Ltd from and against any claims, damages, losses, liabilities, costs, and expenses, including reasonable attorneys' fees, arising out of or in connection with the client's use of the services provided by the Elsner Technologies Pvt Ltd under the Contract.</li>
        <li><strong>Notice and Cooperation:</strong> Each party shall promptly notify the other party in writing of any claim or action for which indemnification may be sought and shall cooperate fully with the other party to defend any such claim or action.</li>
        <li><strong>Limitation of Liability:</strong> Each party's maximum aggregate liability under this Agreement shall not exceed the total fees paid or payable by the party to Elsner under the Contract.</li>
        <li><strong>Miscellaneous:</strong> This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, understandings, and agreements between the parties. This Agreement shall be governed by and construed by the laws of India without giving effect to any choice or conflict of law provision or rule that would cause the application of the laws of any jurisdiction other than Ahmedabad, Gujarat, India. This Agreement may not be amended or modified except in writing, signed by both parties.</li>
      </ol>

      <h3>INTELLECTUAL PROPERTY RIGHTS</h3>
      <p>The Elsner Technologies Pvt Ltd guarantees that all Work Product (As mentioned in SOW) and all associated IP rights are free of any employee's, subcontractors, or other third party rights to the fullest extent permitted by law. Subject to full payment released by client, the client shall be the sole and exclusive owner of all Work, Products (As mentioned in SOW), and all associated IP rights. The Elsner Technologies Pvt Ltd agrees to and, at this moment, assign to the client or its nominee all rights, title, and interest in such Work, Product (As mentioned in SOW), and IP rights free and clear of any encumbrances. The Elsner Technologies Pvt Ltd agrees to cause any of its personnel or other third party acting in connection with the Services to assign to the client or its nominee all their respective rights, title, and interest in Work, Product (As mentioned in SOW) and associated IP rights. The Elsner Technologies Pvt Ltd agrees to promptly and fully disclose all Work, Product (As mentioned in SOW), and associated IP rights to the client. At the request of the client, The Elsner Technologies Pvt Ltd agrees to execute or cause to be executed formal assignment documents and any other documents reasonably requested by the client or its nominee.</p>

      <h3>CONFIDENTIALITY</h3>
      <p>The Elsner Technologies Pvt Ltd agrees that during the term and after that, it shall use Confidential Information solely for this agreement. And it shall not disclose confidential information to any third party (other than its employees, consultants, and professional advisors on a need-to-know basis bound by non-disclosure obligations). For purposes hereof, "Confidential Information" shall not include information which The Elsner Technologies Pvt Ltd independently develops without the use of or reference to any confidential information. The terms and conditions of this agreement shall be deemed confidential Information. Upon the client's request, Elsner Technologies Pvt. Ltd. shall promptly return all Confidential Information to the client.</p>

      <h3>SECURING THE DEAL: PRICE VALIDITY AND CONTRACT TERMS</h3>
      <ul>
        <li>The quoted price in the contract will remain valid until 30 days of the receipt of the same. If the contract is not signed on or before this date, we will need to reevaluate the estimate provided.</li>
        <li>Once the contract or agreement for the mentioned service is finalized, the price may be subject to fluctuations or adjustments based on certain factors and negotiations.</li>
        <li>To uphold the level of excellence in our service provision, it is customary to sign a renewal contract or agreement on an annual basis.</li>
      </ul>
    </section>
  `;
}
