import React, { useState } from 'react';
import request from './ApiRequest.js';

// Helper to parse nested key strings into objects
const setNestedValue = (obj, path, value) => {
    const keys = path.replace(/\]/g, '').split(/\[|\./);
    keys.reduce((acc, key, i) => {
        if (i === keys.length - 1) {
            acc[key] = value;
        } else {
            if (!(key in acc)) {
                acc[key] = isNaN(keys[i + 1]) ? {} : [];
            }
            acc = acc[key];
        }
        return acc;
    }, obj);
};

const ApiTester = () => {
    const [method, setMethod] = useState('POST');
    const [url, setUrl] = useState('');
    const [headers, setHeaders] = useState([{ key: '', value: '' }]);
    const [formData, setFormData] = useState([{ key: '', value: '' }]);
    const [fileInputs, setFileInputs] = useState([{ key: '', file: null }]);
    const [response, setResponse] = useState(null);
    const [isFormData, setIsFormData] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAddHeader = () => setHeaders([...headers, { key: '', value: '' }]);
    const handleAddFormField = () => setFormData([...formData, { key: '', value: '' }]);
    const handleAddFileInput = () => setFileInputs([...fileInputs, { key: '', file: null }]);

    const handleSend = async () => {
        setLoading(true);
        let headerObj = {};
        headers.forEach(h => {
            if (h.key) headerObj[h.key] = h.value;
        });

        let data;
        const isJson = !isFormData;

        if (isFormData) {
            data = new FormData();
            formData.forEach(f => {
                if (f.key) data.append(f.key, f.value);
            });
            fileInputs.forEach(f => {
                if (f.key && f.file) {
                    data.append(f.key, f.file);
                }
            });
        } else {
            data = {};
            formData.forEach(f => {
                if (f.key) {
                    setNestedValue(data, f.key, f.value);
                }
            });
        }

        try {
            const res = await request[method.toLowerCase()](url, data, isJson, headerObj);
            setResponse({ success: true, data: res });
        } catch (err) {
            setResponse({ success: false, data: err.response?.data || err.message });
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            fontFamily: 'Inter, sans-serif',
            background: '#f9f9f9',
            padding: '30px',
            maxWidth: '900px',
            margin: '30px auto',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        },
        section: { marginBottom: '20px' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '5px' },
        input: {
            padding: '10px',
            width: '100%',
            maxWidth: '100%',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px',
        },
        row: { display: 'flex', gap: '10px', marginBottom: '10px' },
        button: {
            background: '#0073e6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginTop: '10px',
        },
        responseBox: {
            background: '#fff',
            border: '1px solid #ddd',
            padding: '15px',
            borderRadius: '5px',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
            maxHeight: '400px',
        },
        checkbox: { marginLeft: '5px', verticalAlign: 'middle' },
    };

    return (
        <div style={styles.container}>
            <h2>🌐 API Tester</h2>

            <div style={styles.section}>
                <div style={styles.row}>
                    <select style={{ ...styles.input, maxWidth: '120px' }} value={method} onChange={(e) => setMethod(e.target.value)}>
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <input 
                        type="text" 
                        value={'/zencommunity/v1'} 
                        style={{
                            marginBottom: '10px',
                            marginRight: '-13px',
                            border: '1px solid rgb(204, 204, 204)',
                            borderRadius: '5px',
                            fontSize: '14px'
                          }}
                        disabled/>
                    <input
                        style={{ ...styles.input, flex: 1 }}
                        placeholder="Enter API URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>
            </div>

            <div style={styles.section}>
                <h4>🔐 Headers</h4>
                {headers.map((h, i) => (
                    <div style={styles.row} key={i}>
                        <input
                            style={{ ...styles.input, flex: 1 }}
                            placeholder="Header Key"
                            value={h.key}
                            onChange={(e) => {
                                const newHeaders = [...headers];
                                newHeaders[i].key = e.target.value;
                                setHeaders(newHeaders);
                            }}
                        />
                        <input
                            style={{ ...styles.input, flex: 1 }}
                            placeholder="Header Value"
                            value={h.value}
                            onChange={(e) => {
                                const newHeaders = [...headers];
                                newHeaders[i].value = e.target.value;
                                setHeaders(newHeaders);
                            }}
                        />
                    </div>
                ))}
                <button style={styles.button} onClick={handleAddHeader}>+ Add Header</button>
            </div>

            <div style={styles.section}>
                <h4>📦 Body</h4>
                <label style={styles.label}>
                    <input
                        type="checkbox"
                        checked={isFormData}
                        onChange={() => setIsFormData(!isFormData)}
                        style={styles.checkbox}
                    /> Use <code>multipart/form-data</code> (with file upload)
                </label>

                {formData.map((f, i) => (
                    <div style={styles.row} key={i}>
                        <input
                            style={{ ...styles.input, flex: 1 }}
                            placeholder="Field Key"
                            value={f.key}
                            onChange={(e) => {
                                const newForm = [...formData];
                                newForm[i].key = e.target.value;
                                setFormData(newForm);
                            }}
                        />
                        <input
                            style={{ ...styles.input, flex: 1 }}
                            placeholder="Field Value"
                            value={f.value}
                            onChange={(e) => {
                                const newForm = [...formData];
                                newForm[i].value = e.target.value;
                                setFormData(newForm);
                            }}
                        />
                    </div>
                ))}
                <button style={styles.button} onClick={handleAddFormField}>+ Add Field</button>

                {isFormData && (
                    <div style={{ marginTop: '10px' }}>
                        <h4>🗂️ Files</h4>
                        {fileInputs.map((f, i) => (
                            <div style={styles.row} key={i}>
                                <input
                                    style={{ ...styles.input, flex: 1 }}
                                    placeholder="Field Key (e.g. user[avatar])"
                                    value={f.key}
                                    onChange={(e) => {
                                        const updated = [...fileInputs];
                                        updated[i].key = e.target.value;
                                        setFileInputs(updated);
                                    }}
                                />
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        const updated = [...fileInputs];
                                        updated[i].file = e.target.files[0];
                                        setFileInputs(updated);
                                    }}
                                    style={{ flex: 1 }}
                                />
                            </div>
                        ))}
                        <button style={styles.button} onClick={handleAddFileInput}>+ Add File Field</button>
                    </div>
                )}
            </div>

            <div style={styles.section}>
                <button onClick={handleSend} disabled={loading} style={styles.button}>
                    {loading ? '⏳ Sending...' : '🚀 Send Request'}
                </button>
            </div>

            <div style={styles.section}>
                <h4>📬 Response</h4>
                <div style={styles.responseBox}>
                    {response ? (
                        <code>{JSON.stringify(response.data, null, 2)}</code>
                    ) : (
                        <span style={{ color: '#888' }}>No response yet</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiTester;
