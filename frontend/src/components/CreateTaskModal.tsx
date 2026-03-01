import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (title: string, description?: string) => void;
}

const CreateTaskModal: React.FC<Props> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const submit = () => {
    if (!title.trim()) return alert('Title is required');
    onCreate(title, description);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={{ color: '#16a34a' }}>New Task</h3>

        <input
          style={styles.input}
          placeholder="Task title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <textarea
          style={styles.textarea}
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <div style={styles.actions}>
          <button onClick={onClose}>Cancel</button>
          <button style={styles.primary} onClick={submit}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: {
    background: '#fff',
    padding: 20,
    width: 400,
    borderRadius: 8
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10
  },
  textarea: {
    width: '100%',
    padding: 10,
    height: 80
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 15
  },
  primary: {
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 4
  }
};

export default CreateTaskModal;
