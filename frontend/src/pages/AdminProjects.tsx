import React, { FormEvent, useEffect, useState } from 'react';
import { createProject, getMyProjects } from '../api/projects';
import { createUser, getUsers } from '../api/users';
import { Project } from '../types/projects';
import { User } from '../types';
import './AdminProjects.css';

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

  useEffect(() => {
    Promise.all([getMyProjects(), getUsers()])
      .then(([projectData, userData]) => {
        setProjects(projectData);
        setUsers(userData);
      })
      .catch((err: any) =>
        setError(err.response?.data?.message || 'Unable to load admin data.')
      )
      .finally(() => setLoading(false));
  }, []);

  const createNewProject = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const project = await createProject(
        projectName,
        description || undefined
      );
      setProjects((current) => [...current, project]);
      setProjectName('');
      setDescription('');
      setNotice('Project created — you are its first member.');
      setActiveTab('projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to create project.');
    } finally {
      setSaving(false);
    }
  };
  const createNewUser = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const user = await createUser(userName, email, password);
      setUsers((current) => [...current, user]);
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
    <main className="admin-page">
      <p className="admin-eyebrow">Workspace control</p>
      <h1>Admin tools</h1>
      <div className="admin-tabs" role="tablist">
        {(
          [
            ['projects', 'My Projects'],
            ['new-project', 'Create Project'],
            ['new-user', 'Create User'],
          ] as [Tab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="admin-alert error">{error}</p>}
      {notice && <p className="admin-alert success">{notice}</p>}
      {activeTab === 'projects' && (
        <section className="admin-section">
          <h2>Projects you belong to</h2>
          {loading ? (
            <p className="admin-loading">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="admin-empty">
              You are not a member of any projects yet.
            </p>
          ) : (
            <div className="admin-grid">
              {projects.map((project) => (
                <article className="admin-project-card" key={project._id}>
                  <h3>{project.name}</h3>
                  {project.description && <p>{project.description}</p>}
                  <small>
                    {project.members.length} member
                    {project.members.length === 1 ? '' : 's'}
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {activeTab === 'new-project' && (
        <form className="admin-form" onSubmit={createNewProject}>
          <h2>Create a project</h2>
          <label>
            Project name
            <input
              required
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </label>
          <label>
            Description (optional)
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button disabled={saving}>
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}
      {activeTab === 'new-user' && (
        <section>
          <form className="admin-form" onSubmit={createNewUser}>
            <h2>Create a user</h2>
            <label>
              Name
              <input
                required
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </form>
          <p className="admin-summary">
            {users.length} user{users.length === 1 ? '' : 's'} available to add
            to projects.
          </p>
        </section>
      )}
    </main>
  );
};

export default AdminProjectsPage;
