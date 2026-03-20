/**
 * SendForSignatureModal — send a document for signature via Zoho Sign.
 * Accepts client name, client email, optional request name, and document (PDF file or base64 from parent).
 */
import { useState } from 'react';
import { Modal, Form, Input, Button, message, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { post, ENDPOINTS } from '../api';

const layout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};

export default function SendForSignatureModal({ open, onClose, onSuccess, documentBase64: initialDocumentBase64, requestName: initialRequestName, templateId, proposalId }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let documentBase64 = initialDocumentBase64;
      if (!documentBase64) {
        const fileList = values.document;
        const file = fileList?.[0]?.originFileObj || fileList?.[0];
        if (!file) {
          message.error('Please upload a PDF document.');
          return;
        }
        documentBase64 = await fileToBase64(file);
      }
      setLoading(true);
      const { data } = await post(ENDPOINTS.ZOHO_SEND_DOCUMENT, {
        documentBase64,
        requestName: values.requestName || initialRequestName || 'Document for signature',
        signerName: values.signerName.trim(),
        signerEmail: values.signerEmail.trim().toLowerCase(),
        templateId: templateId || undefined,
        proposalId: proposalId || undefined,
      });
      message.success('Document sent for signature.');
      form.resetFields();
      onSuccess?.(data?.data?.request_id);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send document.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const normFile = (e) => {
    if (Array.isArray(e)) return e;
    if (e?.fileList) return e.fileList.filter((f) => f.originFileObj?.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf'));
    return [];
  };

  return (
    <Modal
      title="Send for Signature"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={480}
    >
      <Form form={form} {...layout} onFinish={handleSubmit}>
        {!initialDocumentBase64 && (
          <Form.Item
            label="Document (PDF)"
            name="document"
            valuePropName="fileList"
            getValueFromEvent={normFile}
            rules={[{ required: true, message: 'Upload a PDF document.' }]}
          >
            <Upload
              maxCount={1}
              accept=".pdf,application/pdf"
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>Select PDF</Button>
            </Upload>
          </Form.Item>
        )}
        <Form.Item
          label="Request name"
          name="requestName"
          initialValue={initialRequestName}
        >
          <Input placeholder="e.g. Contract – Acme Corp" />
        </Form.Item>
        <Form.Item
          label="Client name"
          name="signerName"
          rules={[{ required: true, message: 'Required.' }]}
        >
          <Input placeholder="Signer full name" />
        </Form.Item>
        <Form.Item
          label="Client email"
          name="signerEmail"
          rules={[
            { required: true, message: 'Required.' },
            { type: 'email', message: 'Invalid email.' },
          ]}
        >
          <Input type="email" placeholder="signer@example.com" />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Send for Signature
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={handleClose}>
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
