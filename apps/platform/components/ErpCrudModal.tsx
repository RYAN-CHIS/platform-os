'use client';

import { useState, useCallback } from 'react';

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
}

interface ErpCrudModalProps {
  title: string;
  fields: Field[];
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

export default function ErpCrudModal({ title, fields, initialData, onSave, onClose }: ErpCrudModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    fields.forEach(f => {
      init[f.key] = initialData?.[f.key] ?? (f.type === 'number' ? '' : '');
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = useCallback((key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
    // Convert number fields
    const data: Record<string, any> = { ...formData };
    fields.forEach(f => {
      if (f.type === 'number' && data[f.key] !== '') {
          data[f.key] = parseFloat(data[f.key]);
        }
      });
      await onSave(data);
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [formData, fields, onSave]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 28, width: 520, maxHeight: '80vh',
        overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: '#1c1917', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: '#a8a29e', lineHeight: 1,
          }}>×</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, color: '#78716c', marginBottom: 4, display: 'block' }}>
                {f.label}{f.required ? ' *' : ''}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={formData[f.key] || ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e7e5e4',
                    borderRadius: 6, fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              ) : f.type === 'select' && f.options ? (
                <select
                  value={formData[f.key] || ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e7e5e4',
                    borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff',
                  }}
                >
                  <option value="">{f.placeholder || `请选择${f.label}`}</option>
                  {f.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  value={formData[f.key] || ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e7e5e4',
                    borderRadius: 6, fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{
            padding: '8px 20px', background: '#f5f5f4', border: 'none',
            borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#78716c',
          }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 24px', background: '#1c1917', color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
