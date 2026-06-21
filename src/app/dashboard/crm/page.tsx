'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  MessageSquare,
  X,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  platform: 'facebook' | 'instagram' | 'whatsapp';
  lastActive: string;
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Imran Khan',
    phone: '01712345678',
    email: 'imran@gmail.com',
    address: 'House 42, Road 11, Banani, Dhaka',
    totalOrders: 5,
    totalSpent: 6200,
    platform: 'facebook',
    lastActive: '5 mins ago'
  },
  {
    id: '2',
    name: 'Sumaiya Rahman',
    phone: '01987654321',
    email: 'sumaiya@gmail.com',
    address: 'Sector 4, Uttara, Dhaka',
    totalOrders: 3,
    totalSpent: 4500,
    platform: 'whatsapp',
    lastActive: '15 mins ago'
  },
  {
    id: '3',
    name: 'Rakib Hasan',
    phone: '01511223344',
    email: 'rakib@gmail.com',
    address: 'Agrabad, Chittagong',
    totalOrders: 12,
    totalSpent: 18400,
    platform: 'instagram',
    lastActive: '2 hours ago'
  },
  {
    id: '4',
    name: 'Tariqul Islam',
    phone: '01811229988',
    email: 'tariqul@gmail.com',
    address: 'Mirpur 10, Dhaka',
    totalOrders: 1,
    totalSpent: 1200,
    platform: 'facebook',
    lastActive: '1 day ago'
  }
];

export default function CRMPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<'all' | 'facebook' | 'instagram' | 'whatsapp'>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // New customer form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerPlatform, setNewCustomerPlatform] = useState<'facebook' | 'instagram' | 'whatsapp'>('facebook');

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.phone.includes(searchTerm) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || c.platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone) return;

    const newCustomer: Customer = {
      id: String(customers.length + 1),
      name: newCustomerName,
      phone: newCustomerPhone,
      email: newCustomerEmail || 'No email',
      address: newCustomerAddress || 'No address provided',
      totalOrders: 0,
      totalSpent: 0,
      platform: newCustomerPlatform,
      lastActive: 'Just now'
    };

    setCustomers([newCustomer, ...customers]);
    setIsDrawerOpen(false);
    
    // Reset Form
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setNewCustomerAddress('');
    setNewCustomerPlatform('facebook');
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <span className="px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full border border-blue-100 uppercase">Facebook</span>;
      case 'instagram':
        return <span className="px-2 py-1 text-[10px] font-bold bg-pink-50 text-pink-600 rounded-full border border-pink-100 uppercase">Instagram</span>;
      case 'whatsapp':
        return <span className="px-2 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 uppercase">WhatsApp</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            CRM & Customers
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Manage unified client profiles captured from all omnichannel pipelines.</p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total profiles</p>
          <h4 className="text-xl font-black text-zinc-950 mt-1">{customers.length}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active Today</p>
          <h4 className="text-xl font-black text-zinc-950 mt-1">3 customers</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">WhatsApp Clients</p>
          <h4 className="text-xl font-black text-zinc-950 mt-1">
            {customers.filter(c => c.platform === 'whatsapp').length}
          </h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Meta Sync channels</p>
          <h4 className="text-xl font-black text-emerald-600 mt-1">Active</h4>
        </div>
      </div>

      {/* Filters & Actions Panel */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {(['all', 'facebook', 'instagram', 'whatsapp'] as const).map((plat) => (
            <button
              key={plat}
              onClick={() => setFilterPlatform(plat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                filterPlatform === plat 
                  ? 'bg-zinc-900 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {plat}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List Display (Responsive Table & Card Grid) */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* DESKTOP/TABLET GRID VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
              <tr>
                <th className="p-4">Client</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Orders</th>
                <th className="p-4">Total Value</th>
                <th className="p-4">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-400">No client profiles found.</td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{cust.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{cust.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getPlatformBadge(cust.platform)}</td>
                    <td className="p-4 space-y-0.5">
                      <p className="font-semibold text-zinc-800">{cust.phone}</p>
                      <p className="text-[10px] text-zinc-500">{cust.email}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-md">{cust.totalOrders}</span>
                    </td>
                    <td className="p-4 font-bold text-zinc-900">৳{cust.totalSpent.toLocaleString()}</td>
                    <td className="p-4 text-zinc-500 font-medium">{cust.lastActive}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE PORTRAIT CARDS VIEW */}
        <div className="block md:hidden divide-y divide-zinc-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">No client profiles found.</div>
          ) : (
            filteredCustomers.map((cust) => (
              <div key={cust.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      {cust.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{cust.name}</h4>
                      <p className="text-[9px] text-zinc-400">{cust.lastActive}</p>
                    </div>
                  </div>
                  {getPlatformBadge(cust.platform)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    <span className="truncate">{cust.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <ShoppingBag className="w-3 h-3 text-zinc-400" />
                    <span>{cust.totalOrders} Orders</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-600 col-span-2">
                    <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="truncate leading-none">{cust.address}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADD CUSTOMER MODAL / SIDE DRAWER */}
      {isDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed top-0 bottom-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-zinc-200 shadow-xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-950">Add new customer</h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="flex-1 flex flex-col justify-between mt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Imran Khan"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 017xxxxxxxx"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. customer@example.com"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Delivery Address</label>
                  <textarea
                    rows={3}
                    placeholder="Complete delivery details..."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Lead Source / Channel</label>
                  <select
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    value={newCustomerPlatform}
                    onChange={(e) => setNewCustomerPlatform(e.target.value as any)}
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
