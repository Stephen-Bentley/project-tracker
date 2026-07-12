import React, { FormEvent, useEffect, useState } from 'react';
import { createProject, getMyProjects } from '../api/projects';
import { createUser, getUsers } from '../api/users';
import { Project } from '../types/projects';
import { User } from '../types';

type Tab = 'projects' | 'new-project' | 'new-user';

const AdminProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loadData = async () => {
    try {
      const [projectData, userData] = await Promise.all([getMyProjects(), getUsers()]);
      setProjects(projectData);
      setUsers(userData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);

    try {
      const project = await createProject(projectName, description || undefined);
      setProjects((current) => [...current, project]);
      setProjectName('');
      setDescription('');
      setNotice('Project created. You have been added as its first member.');
      setActiveTab('projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to create project.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);

    try {
      const user = await createUser(userName, email, password);
      setUsers((current) => [...current, user].sort((a, b) => a.name.localeCompare(b.name)));
      setUserName('');
      setEmail('');
      setPassword('');
      setNotice('User created successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Admin</h1>
      <div style={styles.tabs} role="tablist" aria-label="Admin options">
        <button type="button" onClick={() => setActiveTab('projects')} style={tabStyle(activeTab === 'projects')}>My Projects</button>
        <button type="button" onClick={() => setActiveTab('new-project')} style={tabStyle(activeTab === 'new-project')}>Create Project</button>
        <button type="button" onClick={() => setActiveTab('new-user')} style={tabStyle(activeTab === 'new-user')}>Create User</button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {notice && <p style={styles.notice}>{notice}</p>}

      {activeTab === 'projects' && (
        <section>
          <h2>Projects you belong to</h2>
          {loading ? <p>Loading projects...</p> : projects.length === 0 ? <p>You are not a member of any projects yet.</p> : (
            <div style={styles.grid}>
              {projects.map((project) => (
                <article key={project._id} style={styles.card}>
                  <h3 style={styles.cardTitle}>{project.name}</h3>
                  {project.description && <p>{project.description}</p>}
                  <small>{project.members.length} member{project.members.length === 1 ? '' : 's'}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'new-project' && (
        <form onSubmit={handleCreateProject} style={styles.form}>
          <h2>Create a project</h2>
          <label style={styles.label}>Project name<input required value={projectName} onChange={(event) => setProjectName(event.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Description (optional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} style={styles.textarea} /></label>
          <button disabled={saving} style={styles.primaryButton}>{saving ? 'Creating...' : 'Create Project'}</button>
        </form>
      )}

      {activeTab === 'new-user' && (
        <section>
          <form onSubmit={handleCreateUser} style={styles.form}>
            <h2>Create a user</h2>
            <label style={styles.label}>Name<input required value={userName} onChange={(event) => setUserName(event.target.value)} style={styles.input} /></label>
            <label style={styles.label}>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={styles.input} /></label>
            <label style={styles.label}>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={styles.input} /></label>
            <button disabled={saving} style={styles.primaryButton}>{saving ? 'Creating...' : 'Create User'}</button>
          </form>
          <p style={styles.userSummary}>{users.length} user{users.length === 1 ? '' : 's'} available to add to projects.</p>
        </section>
      )}
    </main>
  );
};

const tabStyle = (isActive: boolean): React.CSSProperties => ({ background: isActive ? '#16a34a' : '#ffffff', border: '1px solid #16a34a', borderRadius: 4, color: isActive ? '#ffffff' : '#166534', cursor: 'pointer', padding: '8px 12px' });
const styles: Record<string, React.CSSProperties> = {
  page: { margin: '0 auto', maxWidth: 1000, padding: 24 }, title: { color: '#166534' }, tabs: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }, error: { background: '#fee2e2', color: '#991b1b', padding: 12 }, notice: { background: '#dcfce7', color: '#166534', padding: 12 }, grid: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }, card: { background: '#ffffff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: 18 }, cardTitle: { marginTop: 0 }, form: { background: '#ffffff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520, padding: 24 }, label: { display: 'flex', flexDirection: 'column', fontWeight: 600, gap: 6 }, input: { border: '1px solid #d1d5db', borderRadius: 4, font: 'inherit', padding: 10 }, textarea: { border: '1px solid #d1d5db', borderRadius: 4, font: 'inherit', minHeight: 100, padding: 10, resize: 'vertical' }, primaryButton: { alignSelf: 'flex-start', background: '#16a34a', border: 'none', borderRadius: 4, color: '#ffffff', cursor: 'pointer', font: 'inherit', padding: '10px 14px' }, userSummary: { color: '#4b5563' },
};

export default AdminProjectsPage;
