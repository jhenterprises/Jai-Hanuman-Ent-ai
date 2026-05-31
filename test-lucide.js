const lucide = require('lucide-react');
const icons = ['Users', 'UserCheck', 'FileText', 'Clock', 'CheckCircle', 'XCircle', 'IndianRupee', 'Activity', 'Plus', 'FileSpreadsheet', 'Server', 'Database', 'ArrowRight', 'ShieldCheck', 'Download', 'Search', 'Bell', 'ChevronDown', 'User', 'Settings', 'Key', 'LogOut', 'MoreVertical', 'Edit', 'Check', 'X'];
const missing = icons.filter(icon => !lucide[icon]);
console.log('Missing modules:', missing);
