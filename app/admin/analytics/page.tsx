'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiHome,
  FiCalendar,
  FiDollarSign,
  FiActivity,
  FiEye,
  FiClock,
  FiBarChart2,
  FiPieChart,
  FiArrowUpRight,
  FiArrowDownRight,
  FiRefreshCw
} from 'react-icons/fi';

interface AnalyticsData {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  userGrowth: number;
  totalResorts: number;
  activeResorts: number;
  pendingResorts: number;
  resortGrowth: number;
  totalBookings: number;
  bookingsToday: number;
  bookingsWeek: number;
  bookingGrowth: number;
  totalRevenue: number;
  revenueToday: number;
  revenueWeek: number;
  revenueGrowth: number;
  avgBookingValue: number;
  conversionRate: number;
  bookingsByStatus: { status: string; count: number }[];
  bookingsByMonth: { month: string; count: number; revenue: number }[];
  topResorts: { id: string; name: string; bookings: number; revenue: number }[];
  usersByRole: { role: string; count: number }[];
  recentActivity: { action: string; time: string; details: string }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchAnalytics = async () => {
    try {
      // Fetch users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // New users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // New users this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newUsersWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Previous week users for growth
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { count: prevWeekUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

      // Resorts
      const { count: totalResorts } = await supabase
        .from('resorts')
        .select('*', { count: 'exact', head: true });

      const { count: activeResorts } = await supabase
        .from('resorts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { count: pendingResorts } = await supabase
        .from('resorts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Bookings
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      const { count: bookingsToday } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { count: bookingsWeek } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      const { count: prevWeekBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

      // Revenue (sum of booking amounts)
      const { data: revenueData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'confirmed');

      const totalRevenue = revenueData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

      const { data: revenueTodayData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'confirmed')
        .gte('created_at', today.toISOString());

      const revenueToday = revenueTodayData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

      const { data: revenueWeekData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'confirmed')
        .gte('created_at', weekAgo.toISOString());

      const revenueWeek = revenueWeekData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

      // Bookings by status
      const { data: statusData } = await supabase
        .from('bookings')
        .select('status');

      const statusCounts: Record<string, number> = {};
      statusData?.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });

      const bookingsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));

      // Top resorts
      const { data: topResortsData } = await supabase
        .from('bookings')
        .select('resort_id, total_price, resorts(name)')
        .eq('status', 'confirmed');

      const resortStats: Record<string, { name: string; bookings: number; revenue: number }> = {};
      topResortsData?.forEach((b: any) => {
        const id = b.resort_id;
        if (!resortStats[id]) {
          resortStats[id] = { name: b.resorts?.name || 'Unknown', bookings: 0, revenue: 0 };
        }
        resortStats[id].bookings++;
        resortStats[id].revenue += b.total_price || 0;
      });

      const topResorts = Object.entries(resortStats)
        .map(([id, stats]) => ({ id, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Users by role
      const { data: roleData } = await supabase
        .from('profiles')
        .select('role, is_admin');

      const roleCounts: Record<string, number> = { guest: 0, owner: 0, admin: 0 };
      roleData?.forEach(u => {
        if (u.is_admin) roleCounts.admin++;
        else if (u.role === 'owner') roleCounts.owner++;
        else roleCounts.guest++;
      });

      const usersByRole = Object.entries(roleCounts).map(([role, count]) => ({ role, count }));

      // Calculate growth percentages
      const userGrowth = prevWeekUsers ? (((newUsersWeek || 0) - prevWeekUsers) / prevWeekUsers) * 100 : 0;
      const bookingGrowth = prevWeekBookings ? (((bookingsWeek || 0) - prevWeekBookings) / prevWeekBookings) * 100 : 0;

      setData({
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        userGrowth,
        totalResorts: totalResorts || 0,
        activeResorts: activeResorts || 0,
        pendingResorts: pendingResorts || 0,
        resortGrowth: 0,
        totalBookings: totalBookings || 0,
        bookingsToday: bookingsToday || 0,
        bookingsWeek: bookingsWeek || 0,
        bookingGrowth,
        totalRevenue,
        revenueToday,
        revenueWeek,
        revenueGrowth: 0,
        avgBookingValue: totalBookings ? totalRevenue / totalBookings : 0,
        conversionRate: 0,
        bookingsByStatus,
        bookingsByMonth: [],
        topResorts,
        usersByRole,
        recentActivity: []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <FiArrowUpRight className="w-3 h-3" /> : <FiArrowDownRight className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-8 pb-24 lg:pb-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-xl" />
            <div className="h-80 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">Real-time insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiUsers className="w-5 h-5 text-blue-600" />
            </div>
            <GrowthIndicator value={data?.userGrowth || 0} />
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900">
            {formatNumber(data?.totalUsers || 0)}
          </p>
          <p className="text-xs lg:text-sm text-gray-600 mt-1">Total Users</p>
          <p className="text-xs text-gray-400 mt-2">
            +{data?.newUsersToday || 0} today • +{data?.newUsersWeek || 0} this week
          </p>
        </div>

        {/* Total Resorts */}
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiHome className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-amber-600">
              {data?.pendingResorts || 0} pending
            </span>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900">
            {formatNumber(data?.totalResorts || 0)}
          </p>
          <p className="text-xs lg:text-sm text-gray-600 mt-1">Total Resorts</p>
          <p className="text-xs text-gray-400 mt-2">
            {data?.activeResorts || 0} active
          </p>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiCalendar className="w-5 h-5 text-purple-600" />
            </div>
            <GrowthIndicator value={data?.bookingGrowth || 0} />
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900">
            {formatNumber(data?.totalBookings || 0)}
          </p>
          <p className="text-xs lg:text-sm text-gray-600 mt-1">Total Bookings</p>
          <p className="text-xs text-gray-400 mt-2">
            +{data?.bookingsToday || 0} today • +{data?.bookingsWeek || 0} this week
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FiDollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <GrowthIndicator value={data?.revenueGrowth || 0} />
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900">
            {formatCurrency(data?.totalRevenue || 0)}
          </p>
          <p className="text-xs lg:text-sm text-gray-600 mt-1">Total Revenue</p>
          <p className="text-xs text-gray-400 mt-2">
            Avg: {formatCurrency(data?.avgBookingValue || 0)}/booking
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Booking Status Distribution */}
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Booking Status</h3>
            <FiPieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {data?.bookingsByStatus.map((item) => {
              const total = data.totalBookings || 1;
              const percentage = (item.count / total) * 100;
              const colors: Record<string, string> = {
                pending: 'bg-amber-500',
                confirmed: 'bg-green-500',
                cancelled: 'bg-red-500',
                completed: 'bg-blue-500'
              };
              return (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700">{item.status}</span>
                    <span className="text-gray-500">{item.count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[item.status] || 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Distribution */}
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">User Distribution</h3>
            <FiBarChart2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {data?.usersByRole.map((item) => {
              const total = data.totalUsers || 1;
              const percentage = (item.count / total) * 100;
              const colors: Record<string, string> = {
                guest: 'bg-blue-500',
                owner: 'bg-green-500',
                admin: 'bg-purple-500'
              };
              const icons: Record<string, string> = {
                guest: '👤',
                owner: '🏠',
                admin: '⚙️'
              };
              return (
                <div key={item.role} className="flex items-center gap-4">
                  <span className="text-2xl">{icons[item.role]}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium text-gray-700">{item.role}s</span>
                      <span className="text-gray-500">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${colors[item.role]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Resorts */}
      <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Top Performing Resorts</h3>
          <FiTrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        {data?.topResorts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No booking data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-3 font-medium">Resort</th>
                  <th className="pb-3 font-medium text-right">Bookings</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.topResorts.map((resort, index) => (
                  <tr key={resort.id} className="text-sm">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 truncate max-w-[200px]">
                          {resort.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-gray-600">{resort.bookings}</td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      {formatCurrency(resort.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <FiActivity className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{data?.bookingsToday || 0}</p>
          <p className="text-sm opacity-80">Bookings Today</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <FiDollarSign className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{formatCurrency(data?.revenueToday || 0)}</p>
          <p className="text-sm opacity-80">Revenue Today</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <FiEye className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{data?.pendingResorts || 0}</p>
          <p className="text-sm opacity-80">Pending Approval</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
          <FiClock className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{formatNumber(data?.avgBookingValue || 0)}</p>
          <p className="text-sm opacity-80">Avg Booking Value</p>
        </div>
      </div>
    </div>
  );
}
