import Modal from '../../components/Modal';
import { useFeedback } from '../../components/FeedbackProvider';
import { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserX, Clock, X, Power, ChefHat, Edit2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { usersAPI, menuCategoryAPI } from '../../services/api';

interface PendingUser { id: number; name: string; email: string; createdAt: string; }
interface ApprovedUser { id: number; name: string; email: string; role: string; status: string; createdAt: string; assignedCategories?: number[]; }
interface Category { id: number; name: string; }

const ITEMS_PER_PAGE = 10;

export default function Employees() {
    const { notify, confirmAction } = useFeedback();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
    const [editingUser, setEditingUser] = useState<ApprovedUser | null>(null);
    const [selectedRole, setSelectedRole] = useState('cashier');
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [tempCategories, setTempCategories] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setLoadError('');
        try {
            const [pendingRes, approvedRes, categoriesRes] = await Promise.all([
                usersAPI.getPending(),
                usersAPI.getApproved(),
                menuCategoryAPI.getAll(),
            ]);
            setPendingUsers(pendingRes.data || []);
            setApprovedUsers(approvedRes.data || []);
            setCategories(categoriesRes.data?.data || categoriesRes.data || []);
        } catch { setLoadError('Team members could not be loaded. Check your connection and try again.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openApproveModal = (user: PendingUser) => {
        setSelectedUser(user);
        setSelectedRole('cashier');
        setSelectedCategories([]);
        setTempCategories([]);
        setShowApproveModal(true);
    };

    const toggleCategory = (categoryId: number) => {
        setSelectedCategories(prev => 
            prev.includes(categoryId) 
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const openEditModal = (user: ApprovedUser) => {
        setEditingUser(user);
        setSelectedRole(user.role);
        const categories = user.assignedCategories || [];
        setSelectedCategories(categories);
        setTempCategories(categories);
        setShowEditModal(true);
    };

    const handleUpdateRole = async () => {
        if (!editingUser) return;
        if (selectedRole === 'kitchen' && selectedCategories.length === 0) {
            notify('Please select at least one station/category for kitchen staff');
            return;
        }
        setProcessing(true);
        try {
            await usersAPI.updateRole(editingUser.id, selectedRole, selectedRole === 'kitchen' ? selectedCategories : []);
            setShowEditModal(false);
            setEditingUser(null);
            setSelectedCategories([]);
            setTempCategories([]);
            await fetchData();
        } catch (e: any) { notify(e.response?.data?.error || 'Failed to update role'); }
        finally { setProcessing(false); }
    };

    const handleApprove = async () => {
        if (!selectedUser) return;
        if (selectedRole === 'kitchen' && selectedCategories.length === 0) {
            notify('Please select at least one station/category for kitchen staff');
            return;
        }
        setProcessing(true);
        try {
            await usersAPI.approve(selectedUser.id, selectedRole, selectedRole === 'kitchen' ? selectedCategories : undefined);
            setShowApproveModal(false);
            setSelectedUser(null);
            setSelectedCategories([]);
            setTempCategories([]);
            await fetchData();
        } catch (e: any) { notify(e.response?.data?.error || 'Failed to approve'); }
        finally { setProcessing(false); }
    };

    const handleReject = async (userId: number) => {
        if (!await confirmAction('Are you sure you want to reject this user?')) return;
        try {
            await usersAPI.reject(userId);
            await fetchData();
        } catch (e: any) { notify(e.response?.data?.error || 'Failed to reject'); }
    };

    const handleToggleStatus = async (user: ApprovedUser) => {
        const action = user.status === 'approved' ? 'deactivate' : 'activate';
        if (!await confirmAction(`Are you sure you want to ${action} ${user.name}'s account?`)) return;
        try {
            await usersAPI.toggleStatus(user.id);
            await fetchData();
        } catch (e: any) { notify(e.response?.data?.error || `Failed to ${action} user`); }
    };

    const getTimeAgo = (dateString: string) => {
        const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    if (loading) return <div className="spinner" role="status" aria-label="Loading content" />;

    const roleBg: Record<string, string> = {
        inventory: 'bg-gray-100 text-gray-700',
        cashier: 'bg-blue-100 text-blue-700',
        kitchen: 'bg-amber-100 text-amber-700',
        admin: 'bg-emerald-100 text-emerald-700',
    };

    // Filter approved users based on search query
    const filteredApprovedUsers = approvedUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredApprovedUsers.length / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedUsers = filteredApprovedUsers.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

    return (
        <div className="app-page">
            {loadError && <div role="alert" className="app-form-error">{loadError} <button className="underline ml-2" onClick={() => void fetchData()}>Retry</button></div>}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Users</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage team members and their roles</p>
                </div>
                <div className="relative w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                    />
                </div>
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={18} className="text-amber-500" />
                        <h2 className="text-base font-bold">Pending Approvals</h2>
                        <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex items-center justify-between">
                                <div className="flex-1 min-w-0 mr-2">
                                    <div className="font-semibold text-sm truncate">{user.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                                    <div className="text-[11px] text-amber-600 mt-0.5">Registered {getTimeAgo(user.createdAt)}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => openApproveModal(user)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold border-none cursor-pointer hover:bg-emerald-600 transition font-[inherit]">
                                        <UserCheck size={14} /> Approve
                                    </button>
                                    <button onClick={() => handleReject(user.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold border-none cursor-pointer hover:bg-red-600 transition font-[inherit]">
                                        <UserX size={14} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Users Section */}
            <div className="mb-4">
                {filteredApprovedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-8"><p>{searchQuery ? 'No employees match your search' : 'No employees yet'}</p></div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="app-responsive-table w-full">
                                <thead className="bg-yellow-100 border-b border-gray-200">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Role</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Stations</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedUsers.map(user => (
                                        <tr key={user.id} className={`hover:bg-yellow-50 transition ${user.status === 'inactive' ? 'bg-gray-50' : ''}`}>
                                            <td data-label="Name" className="px-6 py-3">
                                                <div className={`font-medium text-sm ${user.status === 'inactive' ? 'text-gray-400' : 'text-gray-800'}`}>
                                                    {user.name}
                                                </div>
                                            </td>
                                            <td data-label="Email" className="px-6 py-3">
                                                <div className={`text-sm ${user.status === 'inactive' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {user.email}
                                                </div>
                                            </td>
                                            <td data-label="Role" className="px-6 py-3">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'inactive' ? 'bg-gray-200 text-gray-500' : (roleBg[user.role] || 'bg-gray-100 text-gray-600')}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td data-label="Stations" className="px-6 py-3 text-sm">
                                                {user.role === 'kitchen' && user.assignedCategories && user.assignedCategories.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.assignedCategories.map(catId => {
                                                            const catName = categories.find(c => c.id === catId)?.name;
                                                            return catName ? (
                                                                <span key={catId} className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                                                    {catName}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td data-label="Status" className="px-6 py-3">
                                                {user.status === 'inactive' ? (
                                                    <span className="inline-block px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">
                                                        INACTIVE
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                                        ACTIVE
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="Actions" className="px-6 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => openEditModal(user)}
                                                        title="Edit role"
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition cursor-pointer border-none bg-transparent"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(user)}
                                                        title={user.status === 'approved' ? 'Deactivate account' : 'Activate account'}
                                                        className={`p-1.5 rounded-lg transition cursor-pointer border-none ${
                                                            user.status === 'approved' 
                                                                ? 'text-red-600 hover:bg-red-100' 
                                                                : 'text-emerald-600 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, filteredApprovedUsers.length)} of {filteredApprovedUsers.length} employees
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePreviousPage}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        <ChevronLeft size={16} />
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer border-none ${
                                                    currentPage === page
                                                        ? 'bg-brand text-brand-dark font-semibold'
                                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        Next
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Approve Modal — Role Selection */}
            {showApproveModal && selectedUser && (
                <Modal label="Manage team member" onClose={() => setShowApproveModal(false)} className="app-form-modal bg-white rounded-xl p-6 w-full max-w-[400px] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Approve User</h2>
                            <button aria-label="Close dialog" onClick={() => setShowApproveModal(false)} className="border-none bg-transparent cursor-pointer"><X size={20} /></button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <div className="font-semibold">{selectedUser.name}</div>
                            <div className="text-sm text-gray-500">{selectedUser.email}</div>
                        </div>

                        <label className="text-[13px] font-medium block mb-2">Assign Role</label>
                        <div className="flex flex-col gap-2 mb-4">
                            {[
                                { value: 'inventory', label: 'Inventory', desc: 'Supplies, recipes and stock movements' },
                                { value: 'cashier', label: '💰 Cashier', desc: 'Can process orders and handle payments' },
                                { value: 'kitchen', label: '👨‍🍳 Kitchen Staff', desc: 'Can view and manage incoming orders' },
                                { value: 'rider', label: '🛵 Rider', desc: 'Delivery only — sees just their assigned deliveries' },
                                { value: 'admin', label: '🔑 Admin', desc: 'Full access to all features' },
                            ].map(role => (
                                <button key={role.value} onClick={() => {
                                    if (role.value === 'kitchen') {
                                        setSelectedCategories(tempCategories);
                                    } else {
                                        setTempCategories(selectedCategories);
                                        setSelectedCategories([]);
                                    }
                                    setSelectedRole(role.value);
                                }}
                                    className={`p-3 rounded-lg border-2 text-left cursor-pointer transition font-[inherit] ${selectedRole === role.value
                                        ? 'bg-brand/10 border-brand'
                                        : 'bg-white border-gray-200 hover:border-brand/30'
                                        }`}>
                                    <div className="font-semibold text-sm">{role.label}</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">{role.desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Category/Station Selection for Kitchen Staff */}
                        {selectedRole === 'kitchen' && (
                            <div className="mb-5">
                                <label className="text-[13px] font-medium flex items-center gap-1.5 mb-2">
                                    <ChefHat size={14} />
                                    Assign Stations (Categories) *
                                </label>
                                <p className="text-[11px] text-gray-500 mb-2">Select which menu categories this staff member will handle:</p>
                                {categories.length === 0 ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                        <p className="text-sm text-amber-700">No categories available. Please create menu categories first.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 cursor-pointer transition font-[inherit] ${
                                                    selectedCategories.includes(cat.id)
                                                        ? 'bg-amber-500 border-amber-500 text-white'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                                                }`}
                                            >
                                                {selectedCategories.includes(cat.id) ? '✓ ' : ''}{cat.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedCategories.length > 0 && (
                                    <p className="text-[11px] text-emerald-600 mt-2">
                                        {selectedCategories.length} station{selectedCategories.length > 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button className="flex-1 py-3 rounded-lg border border-gray-200 bg-transparent font-medium cursor-pointer font-[inherit]" onClick={() => setShowApproveModal(false)}>Cancel</button>
                            <button className="flex-1 py-3 rounded-lg border-none bg-emerald-500 text-white font-semibold cursor-pointer hover:bg-emerald-600 transition disabled:opacity-60 font-[inherit]"
                                onClick={handleApprove} disabled={processing || (selectedRole === 'kitchen' && selectedCategories.length === 0)}>
                                {processing ? 'Approving...' : 'Approve'}
                            </button>
                        </div>
                    </Modal>
            )}

            {/* Edit Employee Modal */}
            {showEditModal && editingUser && (
                <Modal label="Manage team member" onClose={() => setShowEditModal(false)} className="app-form-modal bg-white rounded-xl p-6 w-full max-w-[400px] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Edit Employee</h2>
                            <button aria-label="Close dialog" onClick={() => setShowEditModal(false)} className="border-none bg-transparent cursor-pointer"><X size={20} /></button>
                        </div>

                        {/* Profile Info */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-xl font-bold text-brand-dark">
                                    {editingUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-semibold text-base">{editingUser.name}</div>
                                    <div className="text-sm text-gray-500">{editingUser.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">Current Role:</span>
                                <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${roleBg[editingUser.role] || 'bg-gray-100 text-gray-600'}`}>
                                    {editingUser.role}
                                </span>
                                {editingUser.status === 'inactive' && (
                                    <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-semibold">INACTIVE</span>
                                )}
                            </div>
                            {editingUser.role === 'kitchen' && editingUser.assignedCategories && editingUser.assignedCategories.length > 0 && (
                                <div className="mt-2 text-sm">
                                    <span className="text-gray-500">Stations: </span>
                                    <span className="text-amber-600 font-medium">
                                        {editingUser.assignedCategories.map(catId => categories.find(c => c.id === catId)?.name || catId).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <label className="text-[13px] font-medium block mb-2">Change Role</label>
                        <div className="flex flex-col gap-2 mb-4">
                            {[
                                { value: 'inventory', label: 'Inventory', desc: 'Supplies, recipes and stock movements' },
                                { value: 'cashier', label: '💰 Cashier', desc: 'Can process orders and handle payments' },
                                { value: 'kitchen', label: '👨‍🍳 Kitchen Staff', desc: 'Can view and manage incoming orders' },
                                { value: 'rider', label: '🛵 Rider', desc: 'Delivery only — sees just their assigned deliveries' },
                                { value: 'admin', label: '🔑 Admin', desc: 'Full access to all features' },
                            ].map(role => (
                                <button key={role.value} onClick={() => {
                                    if (role.value === 'kitchen') {
                                        setSelectedCategories(tempCategories);
                                    } else {
                                        setTempCategories(selectedCategories);
                                        setSelectedCategories([]);
                                    }
                                    setSelectedRole(role.value);
                                }}
                                    className={`p-3 rounded-lg border-2 text-left cursor-pointer transition font-[inherit] ${selectedRole === role.value
                                        ? 'bg-brand/10 border-brand'
                                        : 'bg-white border-gray-200 hover:border-brand/30'
                                        }`}>
                                    <div className="font-semibold text-sm">{role.label}</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">{role.desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Category/Station Selection for Kitchen Staff */}
                        {selectedRole === 'kitchen' && (
                            <div className="mb-5">
                                <label className="text-[13px] font-medium flex items-center gap-1.5 mb-2">
                                    <ChefHat size={14} />
                                    Assign Stations (Categories) *
                                </label>
                                <p className="text-[11px] text-gray-500 mb-2">Select which menu categories this staff member will handle:</p>
                                {categories.length === 0 ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                        <p className="text-sm text-amber-700">No categories available. Please create menu categories first.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 cursor-pointer transition font-[inherit] ${
                                                    selectedCategories.includes(cat.id)
                                                        ? 'bg-amber-500 border-amber-500 text-white'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                                                }`}
                                            >
                                                {selectedCategories.includes(cat.id) ? '✓ ' : ''}{cat.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedCategories.length > 0 && (
                                    <p className="text-[11px] text-emerald-600 mt-2">
                                        {selectedCategories.length} station{selectedCategories.length > 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button className="flex-1 py-3 rounded-lg border border-gray-200 bg-transparent font-medium cursor-pointer font-[inherit]" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="flex-1 py-3 rounded-lg border-none bg-blue-500 text-white font-semibold cursor-pointer hover:bg-blue-600 transition disabled:opacity-60 font-[inherit]"
                                onClick={handleUpdateRole} disabled={processing || (selectedRole === 'kitchen' && selectedCategories.length === 0)}>
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </Modal>
            )}
        </div>
    );
}
