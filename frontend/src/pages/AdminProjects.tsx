import React, { FormEvent, useEffect, useState } from 'react';
import {
  addUserToProject,
  createProject,
  getMyProjects,
  removeUserFromProject,
} from '../api/projects';
import { createUser, getCurrentUser, getUsers } from '../api/users';
import { Project } from '../types/projects';
import { User } from '../types';
import './AdminProjects.css';

type Tab = 'projects' | 'new-project' | 'new-user';

const AdminProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>(
    {}
  );
  const [memberAction, setMemberAction] = useState('');

  useEffect(() => {
    Promise.all([getMyProjects(), getUsers(), getCurrentUser()])
      .then(([projectData, userData, currentUser]) => {
        setProjects(projectData);
        setUsers(userData);
        setCurrentUserId(currentUser._id);
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

  const addMember = async (project: Project) => {
    const userId = selectedUsers[project._id];
    if (!userId) return;

    setMemberAction(`${project._id}-${userId}`);
    setError('');
    setNotice('');
    try {
      await addUserToProject(project._id, userId);
      const user = users.find((candidate) => candidate._id === userId);
      if (user) {
        setProjects((current) =>
          current.map((candidate) =>
            candidate._id === project._id
              ? { ...candidate, members: [...candidate.members, user] }
              : candidate
          )
        );
      }
      setSelectedUsers((current) => ({ ...current, [project._id]: '' }));
      setNotice('User added to project.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to add user to project.');
    } finally {
      setMemberAction('');
    }
  };

  const removeMember = async (project: Project, user: User) => {
    setMemberAction(`${project._id}-${user._id}`);
    setError('');
    setNotice('');
    try {
      await removeUserFromProject(project._id, user._id);
      setProjects((current) =>
        current.map((candidate) =>
          candidate._id === project._id
            ? {
                ...candidate,
                members: candidate.members.filter(
                  (member) => member._id !== user._id
                ),
              }
            : candidate
        )
      );
      setNotice('User removed from project.');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Unable to remove user from project.'
      );
    } finally {
      setMemberAction('');
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
                  <div className="project-members">
                    <strong>Members</strong>
                    <ul>
                      {project.members.map((member) => (
                        <li key={member._id}>
                          <span>{member.name}</span>
                          <button
                            type="button"
                            className="remove-member"
                            disabled={
                              member._id === currentUserId ||
                              memberAction === `${project._id}-${member._id}`
                            }
                            onClick={() => removeMember(project, member)}
                          >
                            {member._id === currentUserId
                              ? 'You'
                              : memberAction === `${project._id}-${member._id}`
                                ? 'Removing...'
                                : 'Remove'}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="add-member">
                      <select
                        aria-label={`Add a user to ${project.name}`}
                        value={selectedUsers[project._id] || ''}
                        onChange={(event) =>
                          setSelectedUsers((current) => ({
                            ...current,
                            [project._id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Add a user...</option>
                        {users
                          .filter(
                            (user) =>
                              !project.members.some(
                                (member) => member._id === user._id
                              )
                          )
                          .map((user) => (
                            <option key={user._id} value={user._id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          !selectedUsers[project._id] ||
                          memberAction.startsWith(`${project._id}-`)
                        }
                        onClick={() => addMember(project)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
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
