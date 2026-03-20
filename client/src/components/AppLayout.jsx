import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Layout, Button, Spin, Dropdown, Input, message, Popconfirm } from 'antd';
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
  FolderOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  InboxOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useSearch } from '../context/SearchContext';
import { useFolderMove } from '../context/FolderMoveContext';
import { useFolders } from '../context/FoldersContext';
import { get, ENDPOINTS } from '../api';
import Logo from './Logo';
import LibraryDropdown from './LibraryDropdown';
import CreateFolderModal from './CreateFolderModal';
import { encodeUrlOpaque, decodeUrlOpaque } from '../utils/urlQueryOpaque';
import './AppLayout.css';

const { Header, Sider, Content } = Layout;

const SIDEBAR_WIDTH = 280;

// Folder names matching reference (first = selected when on dashboard)
function getFolderItems(base, canSeeSentProposals, customFolders = []) {
  const items = [
    { key: 'pages', label: 'Pages', path: `${base}/dashboard` },
    { key: 'templates', label: 'Templates', path: `${base}/templates` },
  ];
  customFolders.forEach((folder) => {
    const key = `custom-${folder.id}`;
    items.push({
      key,
      label: folder.name,
      path: `${base}/dashboard?folder=${encodeURIComponent(encodeUrlOpaque(folder.id))}`,
    });
  });
  if (canSeeSentProposals) {
    items.push({ key: 'sent', label: 'Sent Proposals', path: `${base}/sent-proposals` });
  }
  return items;
}

function getBottomNavItems(base, canSeeSentProposals, canSeeAudit) {
  return [
    { key: 'shared', label: 'Shared with me', path: canSeeSentProposals ? `${base}/sent-proposals` : '#', icon: <TeamOutlined /> },
    { key: 'pages', label: 'Pages', path: `${base}/dashboard`, icon: <UnorderedListOutlined /> },
    // { key: 'archived', label: 'Archived', path: canSeeAudit ? `${base}/audit` : '#', icon: <InboxOutlined /> },
    { key: 'deleted', label: 'Deleted', path: `${base}/deleted`, icon: <DeleteOutlined /> },
  ];
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { searchQuery, setSearchQuery } = useSearch();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPages, setSearchPages] = useState([]);
  const [searchPagesLoading, setSearchPagesLoading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [dropTargetFolderKey, setDropTargetFolderKey] = useState(null);
  const { moveProposalToFolder } = useFolderMove();
  const { folders, loading: foldersLoading, createFolder, deleteFolder } = useFolders();
  const [searchParams] = useSearchParams();
  const libraryTriggerRef = useRef(null);
  const searchWrapRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const { user, logout } = useAuthStore();

  const expectedSlug = user?.organization?.slug;

  const base = `/${orgSlug}`;
  const canSeeAudit = user?.role === 'Admin';
  const canSeeOrganizations = user?.role === 'Admin';
  const canSeeSentProposals = user?.permissions?.includes('template_edit') ?? ['Admin', 'Creator'].includes(user?.role);

  const folderQ = searchParams.get('folder');
  const decodedFolderParam = folderQ ? decodeUrlOpaque(folderQ) : '';
  const folderIdFromUrl =
    decodedFolderParam && /^[a-f0-9]{24}$/i.test(decodedFolderParam) ? decodedFolderParam : null;

  const folderItems = useMemo(
    () => getFolderItems(base, canSeeSentProposals, folders),
    [base, canSeeSentProposals, folders]
  );

  async function handleCreateFolder(name) {
    const folder = await createFolder(name);
    navigate(`${base}/dashboard?folder=${encodeURIComponent(encodeUrlOpaque(folder.id))}`);
  }

  async function handleDeleteFolder(item) {
    const id = String(item.key).replace(/^custom-/, '');
    try {
      await deleteFolder(id);
      if (selectedFolderKey === item.key) navigate(`${base}/dashboard`);
      message.success('Folder deleted');
    } catch (e) {
      message.error(e?.response?.data?.error || 'Failed to delete folder');
    }
  }

  const bottomNavItems = getBottomNavItems(base, canSeeSentProposals, canSeeAudit);

  const selectedFolderKey = useMemo(() => {
    const p = location.pathname;
    if (p === `${base}/dashboard`) {
      if (folderIdFromUrl && folders.some((f) => f.id === folderIdFromUrl)) {
        return `custom-${folderIdFromUrl}`;
      }
      return 'pages';
    }
    if (p === `${base}/templates` || p.startsWith(`${base}/templates/`)) return 'templates';
    if (p.startsWith(`${base}/sent-proposals`)) return 'sent';
    return null;
  }, [base, location.pathname, folderIdFromUrl, folders]);

  const selectedBottomKey = bottomNavItems.find((n) => n.path !== '#' && location.pathname.startsWith(n.path))?.key || (location.pathname === `${base}/dashboard` ? 'pages' : null);
  const isDeleted = location.pathname === `${base}/deleted`;

  const isPages = location.pathname === `${base}/dashboard`;
  const isLibrary = location.pathname.startsWith(`${base}/templates`);
  const isReports = location.pathname.startsWith(`${base}/reports`);
  const isEditorPage = /\/proposals\/[^/]+\/edit$/.test(location.pathname) || /\/templates\/[^/]+\/edit$/.test(location.pathname);
  const effectiveCollapsed = collapsed || isEditorPage;

  const isCreator = user?.role === 'Creator';
  const userMenuItems = [
    { key: 'profile', label: <Link to={`${base}/settings/profile`}>Profile</Link> },
    ...(isCreator
      ? []
      : [
          { key: 'team', label: <Link to={`${base}/settings/team`}>Manage team</Link> },
          { key: 'brand', label: <Link to={`${base}/settings/brand`}>Brand setup</Link> },
          { key: 'integrations', label: <Link to={`${base}/settings/integrations`}>Add integrations</Link> },
          { key: 'account', label: <Link to={`${base}/settings/account`}>Account settings</Link> },
        ]),
    { key: 'updates', label: 'Product updates', disabled: true },
    { type: 'divider' },
    { key: 'logout', label: 'Log out', onClick: () => logout().then(() => navigate('/login')) },
  ];

  // Fetch pages (proposals) when search dropdown is open
  const loadSearchPages = useCallback(async () => {
    setSearchPagesLoading(true);
    try {
      const { data } = await get(ENDPOINTS.PROPOSALS);
      setSearchPages(Array.isArray(data) ? data : []);
    } catch {
      setSearchPages([]);
    } finally {
      setSearchPagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchOpen) loadSearchPages();
  }, [searchOpen, loadSearchPages]);

  const filteredSearchPages = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return searchPages;
    return searchPages.filter((p) => {
      const title = (p.title || '').toLowerCase();
      const slug = (p.slug || '').toLowerCase();
      return title.includes(q) || slug.includes(q);
    });
  }, [searchPages, searchQuery]);

  useEffect(() => {
    const close = (e) => {
      if (libraryOpen && libraryTriggerRef.current && !libraryTriggerRef.current.contains(e.target) &&
          !e.target.closest('.library-dropdown-panel') && !e.target.closest('.library-dropdown-backdrop')) {
        setLibraryOpen(false);
      }
      if ((searchQuery || '').trim().length > 0 && searchWrapRef.current && !searchWrapRef.current.contains(e.target) &&
          !e.target.closest('.app-header-search-dropdown')) {
        setSearchQuery('');
        setSearchOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [libraryOpen, searchOpen]);

  const handleSearchPageClick = (proposalId) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(`/${orgSlug}/proposals/${encodeUrlOpaque(proposalId)}/edit`);
  };

  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (expectedSlug && orgSlug !== expectedSlug) {
    return <Navigate to={`/${expectedSlug}/dashboard`} replace />;
  }

  return (
    <Layout className="app-layout-ref">
      <Header className="app-layout-header-ref app-header-full-width">
        <div className="app-header-left">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="app-header-trigger-ref"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          />
          <Link to={`${base}/dashboard`} className="app-header-logo-ref">
            <Logo size="small" />
          </Link>
          <nav className="app-header-nav-ref">
            <Link to={`${base}/dashboard`} className={isPages ? 'active' : ''}>Pages</Link>
            <div className="app-header-nav-library-wrap">
              <div
                ref={libraryTriggerRef}
                className={`app-header-nav-library ${libraryOpen || isLibrary ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setLibraryOpen(!libraryOpen); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setLibraryOpen(!libraryOpen)}
              >
                Library <DownOutlined className="app-header-nav-caret" />
              </div>
              {libraryOpen && (
                <LibraryDropdown visible={libraryOpen} onClose={() => setLibraryOpen(false)} />
              )}
            </div>
            {canSeeSentProposals && (
              <>
                <Link to={`${base}/reports`} className={isReports ? 'active' : ''}>Reports</Link>
                <Link to={`${base}/contracts`} className={location.pathname === `${base}/contracts` ? 'active' : ''}>Contracts</Link>
              </>
            )}
          </nav>
        </div>

        <div className="app-header-search-wrap" ref={searchWrapRef}>
          <SearchOutlined className="app-header-search-icon" />
          <Input
            placeholder="Q Search pages"
            value={searchQuery}
            onChange={(e) => {
              const v = e.target.value;
              setSearchQuery(v);
              setSearchOpen(v.trim().length > 0);
            }}
            variant="borderless"
            className="app-header-search-input"
          />
          {(searchQuery || '').trim().length > 0 && (
            <div className="app-header-search-dropdown">
              <div className="app-header-search-dropdown-head">
                <span className="app-header-search-dropdown-title">Pages</span>
                {searchQuery.trim() && (
                  <span className="app-header-search-dropdown-filter">Filter: {searchQuery}</span>
                )}
              </div>
              <div className="app-header-search-dropdown-list">
                {searchPagesLoading ? (
                  <div className="app-header-search-dropdown-loading">
                    <Spin size="small" />
                  </div>
                ) : filteredSearchPages.length === 0 ? (
                  <div className="app-header-search-dropdown-empty">
                    {searchQuery.trim() ? 'No pages match your search.' : 'No pages yet.'}
                  </div>
                ) : (
                  filteredSearchPages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="app-header-search-dropdown-item"
                      onClick={() => handleSearchPageClick(p.id)}
                    >
                      <FileTextOutlined className="app-header-search-dropdown-item-icon" />
                      <span className="app-header-search-dropdown-item-title">{p.title || 'Untitled'}</span>
                      {p.status && (
                        <span className={`app-header-search-dropdown-item-status ${(p.status || 'draft').toLowerCase()}`}>
                          {(p.status || 'draft').toUpperCase()}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="app-header-right-ref">
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <button type="button" className="app-header-user-btn-ref">
              <span className="app-header-avatar-ref">{initials}</span>
              <DownOutlined className="app-header-avatar-caret" />
            </button>
          </Dropdown>
        </div>
      </Header>

      <div className={`app-layout-body-centering${isEditorPage ? ' app-layout-editor-full' : ''}`}>
        <Layout className={`app-body-ref${isEditorPage ? ' app-body-editor-full' : ''}`}>
        <Sider
          width={SIDEBAR_WIDTH}
          collapsed={effectiveCollapsed}
          collapsedWidth={0}
          className="app-sider-container-ref"
          style={{ background: '#fff' }}
        >
          <div className="app-sider-inner-ref">
            <div className="app-sider-create-ref">
              <span className="app-sider-create-label">CREATE FOLDER</span>
              <button
                type="button"
                className="app-sider-create-btn-ref app-sider-create-btn-circle"
                aria-label="Create folder"
                onClick={() => setCreateFolderOpen(true)}
              >
                +
              </button>
            </div>
            <div className="app-sider-scroll-ref">
              {foldersLoading && (
                <div className="app-sider-folders-loading">
                  <Spin size="small" />
                </div>
              )}
              <div className="app-sider-folders-ref">
                {folderItems.map((item) => {
                  const isActive = selectedFolderKey === item.key;
                  const isDroppable = item.key === 'pages' || String(item.key).startsWith('custom-');
                  const isDropTarget = dropTargetFolderKey === item.key;
                  return (
                    <div
                      key={item.key}
                      className={`app-sider-folder-item-wrap ${isDropTarget ? 'app-sider-folder-item-drop-target' : ''}`}
                      onDragOver={(e) => {
                        if (!isDroppable) return;
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        setDropTargetFolderKey(item.key);
                      }}
                      onDragLeave={(e) => {
                        if (!isDroppable) return;
                        if (!e.currentTarget.contains(e.relatedTarget)) setDropTargetFolderKey(null);
                      }}
                      onDrop={async (e) => {
                        if (!isDroppable) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setDropTargetFolderKey(null);
                        let data;
                        try {
                          data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
                        } catch {
                          return;
                        }
                        const { proposalId, sourceFolderKey } = data;
                        if (!proposalId || item.key === sourceFolderKey) return;
                        try {
                          await moveProposalToFolder(proposalId, item.key, sourceFolderKey);
                          message.success('Page moved to folder');
                        } catch {
                          message.error('Failed to move page');
                        }
                      }}
                    >
                      <div className="app-sider-folder-row">
                        <Link
                          to={item.path}
                          className={`app-sider-folder-item-ref ${isActive ? 'active' : ''}`}
                        >
                          <FolderOutlined className="app-sider-folder-icon-ref" />
                          <span className="app-sider-folder-label-ref">{item.label}</span>
                        </Link>
                        {String(item.key).startsWith('custom-') && (
                          <Popconfirm
                            title="Delete folder?"
                            description="Pages in this folder move to Pages."
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDeleteFolder(item)}
                          >
                            <button
                              type="button"
                              className="app-sider-folder-delete-btn"
                              aria-label="Delete folder"
                              onClick={(e) => e.preventDefault()}
                            >
                              <DeleteOutlined />
                            </button>
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <nav className="app-sider-bottom-nav-ref">
              {bottomNavItems.map((item) => {
                const isActive = selectedBottomKey === item.key || (item.key === 'deleted' && isDeleted);
                if (item.path === '#') {
                  return (
                    <span key={item.key} className="app-sider-nav-item-ref disabled">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={`app-sider-nav-item-ref ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              </nav>
            </div>
          </div>
        </Sider>
        <Content className={`app-layout-content-ref${isEditorPage ? ' app-layout-content-editor-full' : ''}`}>
          <Suspense fallback={<div className="app-content-fallback"><Spin size="large" /></div>}>
            <Outlet />
          </Suspense>
          {/* <a href="#" className="app-help-float-ref" aria-label="Help">? HELP</a> */}
        </Content>
      </Layout>
    </div>
    <CreateFolderModal
      open={createFolderOpen}
      onClose={() => setCreateFolderOpen(false)}
      onCreate={handleCreateFolder}
    />
  </Layout>
  );
}

export default AppLayout;
