// map-server/frontend/src/components/AdminManager.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminManager = ({ onStartWipe }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('users'); 
    
    // Data States
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]); // MỚI
    const [appeals, setAppeals] = useState([]);
    
    // UI States
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [teamSearch, setTeamSearch] = useState(''); // MỚI
    const [wipeCoords, setWipeCoords] = useState({ x1: '', y1: '', x2: '', y2: '' });
    const [loading, setLoading] = useState(false);

    // Helper
    const getAvatarUrl = (u) => {
        if (!u.avatarUrl) return '/default-avatar.png';
        if (u.avatarUrl.startsWith('http')) return u.avatarUrl;
        const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:4000');
        return `${baseUrl}${u.avatarUrl}`;
    };

    // --- FETCH DATA ---
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/users?page=${page}&search=${search}`);
            setUsers(data.users);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const fetchAppeals = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/appeals');
            setAppeals(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    // MỚI: FETCH TEAMS
    const fetchTeams = async () => {
        setLoading(true);
        try {
            const endpoint = teamSearch ? `/teams/search?q=${teamSearch}` : `/teams?page=1&limit=20`;
            const { data } = await api.get(endpoint);
            setTeams(data.teams || data || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => {
        if (!isOpen) return;
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'teams') fetchTeams();
        if (activeTab === 'appeals') fetchAppeals();
    }, [isOpen, activeTab, page, search, teamSearch]);

    // --- ACTIONS ---
    const handleBan = async (userId, type) => {
        if(!confirm("Xác nhận hành động?")) return;
        try { await api.post('/admin/ban-user', { userId, type }); fetchUsers(); } catch (err) { alert(err.response?.data?.message); }
    };
    const handleDeleteUser = async (userId) => {
        if(prompt("Nhập 'DELETE' để xóa:") !== 'DELETE') return;
        try { await api.post('/admin/delete-user', { userId }); fetchUsers(); } catch (err) { alert(err.response?.data?.message); }
    };
    const handleToggleRole = async (userId) => {
        if(!confirm("Đổi quyền admin?")) return;
        try { await api.post('/admin/toggle-role', { targetUserId: userId }); fetchUsers(); } catch (err) { alert(err.response?.data?.message); }
    };
    const handleResolveAppeal = async (appealId, action) => {
        const reason = prompt(action === 'approve' ? "Lời nhắn:" : "Lý do từ chối:");
        try { await api.post('/admin/resolve-appeal', { appealId, action, reason }); fetchAppeals(); } catch (err) { alert(err.response?.data?.message); }
    };
    const handleWipeManual = async () => {
        if(!confirm("Xóa vùng này?")) return;
        try { const res = await api.post('/admin/wipe-area', wipeCoords); alert(res.data.message); } catch (err) { alert(err.response?.data?.message); }
    };

    // MỚI: DISSOLVE TEAM
    const handleDissolveTeam = async (teamId, teamName) => {
        const confirmStr = prompt(`CẢNH BÁO: Nhập tên team "${teamName}" để xác nhận giải tán:`);
        if (confirmStr !== teamName) return alert("Tên không khớp.");
        try {
            await api.post('/admin/dissolve-team', { teamId });
            alert("Đã giải tán team.");
            fetchTeams();
        } catch (err) { alert(err.response?.data?.message); }
    };

    if (!user || (user.role !== 'admin' && user.email !== 'shikiku0402@gmail.com')) return null;

    return (
        <>
            <button className="fixed bottom-4 right-28 z-[1200] bg-red-600 text-white px-4 py-2 rounded-full shadow-lg font-bold hover:bg-red-700 flex items-center gap-2" onClick={() => setIsOpen(true)}>🛡️ Admin</button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-fade-in-down">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <div className="flex gap-2 overflow-x-auto">
                                <h2 className="text-xl font-bold text-gray-800 mr-4">Admin</h2>
                                <button onClick={()=>setActiveTab('users')} className={`px-3 py-1 rounded text-sm font-bold ${activeTab==='users'?'bg-blue-600 text-white':'bg-gray-200'}`}>Users</button>
                                <button onClick={()=>setActiveTab('teams')} className={`px-3 py-1 rounded text-sm font-bold ${activeTab==='teams'?'bg-blue-600 text-white':'bg-gray-200'}`}>Teams</button>
                                <button onClick={()=>setActiveTab('appeals')} className={`px-3 py-1 rounded text-sm font-bold ${activeTab==='appeals'?'bg-blue-600 text-white':'bg-gray-200'}`}>Appeals</button>
                                <button onClick={()=>setActiveTab('tools')} className={`px-3 py-1 rounded text-sm font-bold ${activeTab==='tools'?'bg-blue-600 text-white':'bg-gray-200'}`}>Map Tools</button>
                            </div>
                            <button onClick={()=>setIsOpen(false)} className="text-3xl font-bold text-gray-500 hover:text-red-500">&times;</button>
                        </div>

                        <div className="flex-1 overflow-auto p-4 bg-gray-100">
                            {activeTab === 'users' && (
                                <div className="bg-white rounded-lg shadow p-4">
                                    <input type="text" placeholder="Tìm User..." className="w-full border p-2 rounded mb-4" value={search} onChange={e=>setSearch(e.target.value)} />
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3 text-center">Action</th></tr></thead>
                                        <tbody>
                                            {users.map(u => (
                                                <tr key={u._id} className="border-b">
                                                    <td className="p-3 flex items-center gap-2"><img src={getAvatarUrl(u)} className="w-8 h-8 rounded-full" onError={e=>e.target.src='/default-avatar.png'}/><span className="font-bold">{u.username}</span></td>
                                                    <td className="p-3">{u.role}</td>
                                                    <td className="p-3">{u.isBanned ? <span className="text-red-600 font-bold">BANNED</span> : <span className="text-green-600">Active</span>}</td>
                                                    <td className="p-3 text-center flex gap-1 justify-center">
                                                        <button onClick={()=>handleToggleRole(u._id)} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">Role</button>
                                                        {u.isBanned ? <button onClick={()=>handleBan(u._id,'unban')} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Unban</button> : <button onClick={()=>handleBan(u._id,'3days')} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">Ban</button>}
                                                        <button onClick={()=>handleDeleteUser(u._id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">DEL</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="mt-4 flex justify-between"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 bg-white border">Prev</button><button onClick={()=>setPage(p=>p+1)} className="px-3 py-1 bg-white border">Next</button></div>
                                </div>
                            )}

                            {activeTab === 'teams' && (
                                <div className="bg-white rounded-lg shadow p-4">
                                    <input type="text" placeholder="Tìm Team..." className="w-full border p-2 rounded mb-4" value={teamSearch} onChange={e=>setTeamSearch(e.target.value)} />
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100"><tr><th className="p-3">Team Name</th><th className="p-3">Members</th><th className="p-3">Created</th><th className="p-3 text-center">Action</th></tr></thead>
                                        <tbody>
                                            {teams.map(t => (
                                                <tr key={t._id} className="border-b">
                                                    <td className="p-3 font-bold text-purple-700">{t.name}</td>
                                                    <td className="p-3">{t.memberCount}</td>
                                                    <td className="p-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-3 text-center">
                                                        <button onClick={()=>handleDissolveTeam(t._id, t.name)} className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold border border-red-200 hover:bg-red-200">💥 Giải tán</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {teams.length===0 && <tr><td colSpan="4" className="p-4 text-center">Không tìm thấy team.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'appeals' && (
                                <div className="space-y-4">
                                    {appeals.length===0 && <p className="text-center text-gray-500">Trống.</p>}
                                    {appeals.map(app => (
                                        <div key={app._id} className="bg-white p-4 rounded shadow border-l-4 border-yellow-400">
                                            <div className="flex justify-between font-bold"><span>{app.user?.username || app.email}</span><span className="text-xs text-gray-500">{new Date(app.createdAt).toLocaleString()}</span></div>
                                            <p className="my-2 bg-gray-50 p-2 text-sm">{app.content}</p>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={()=>handleResolveAppeal(app._id,'approve')} className="bg-green-500 text-white px-3 py-1 rounded text-xs">Duyệt</button>
                                                <button onClick={()=>handleResolveAppeal(app._id,'reject')} className="bg-red-500 text-white px-3 py-1 rounded text-xs">Từ chối</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'tools' && (
                                <div className="bg-white p-6 rounded-lg shadow max-w-md mx-auto text-center">
                                    <h3 className="text-lg font-bold text-red-600 mb-4">Xóa Vùng (Wipe Area)</h3>
                                    <button onClick={()=>{setIsOpen(false); if(onStartWipe) onStartWipe();}} className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold shadow w-full mb-6">CHỌN TRÊN MAP</button>
                                    <div className="border-t pt-4">
                                        <p className="text-xs text-gray-500 mb-2">Hoặc nhập tay:</p>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <input type="number" placeholder="X1" className="border p-1" value={wipeCoords.x1} onChange={e=>setWipeCoords({...wipeCoords,x1:e.target.value})} />
                                            <input type="number" placeholder="Y1" className="border p-1" value={wipeCoords.y1} onChange={e=>setWipeCoords({...wipeCoords,y1:e.target.value})} />
                                            <input type="number" placeholder="X2" className="border p-1" value={wipeCoords.x2} onChange={e=>setWipeCoords({...wipeCoords,x2:e.target.value})} />
                                            <input type="number" placeholder="Y2" className="border p-1" value={wipeCoords.y2} onChange={e=>setWipeCoords({...wipeCoords,y2:e.target.value})} />
                                        </div>
                                        <button onClick={handleWipeManual} className="bg-gray-600 text-white px-4 py-2 rounded font-bold w-full">Xóa theo tọa độ</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
export default AdminManager;