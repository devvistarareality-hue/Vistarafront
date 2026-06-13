export const PROJECTS = [
  {
    id: 'p1',
    name: 'Vistara Heights',
    location: 'Ahmedabad, Gujarat',
    type: 'Residential',
    units: 120,
    priceRange: '₹45L – ₹85L',
    status: 'Active',
    leadCount: 45,
    description: '2 & 3 BHK premium apartments with modern amenities.',
  },
  {
    id: 'p2',
    name: 'Green Valley Residency',
    location: 'Gandhinagar, Gujarat',
    type: 'Residential',
    units: 80,
    priceRange: '₹35L – ₹65L',
    status: 'Active',
    leadCount: 32,
    description: 'Affordable township with green spaces and club house.',
  },
  {
    id: 'p3',
    name: 'Skyline Business Park',
    location: 'Surat, Gujarat',
    type: 'Commercial',
    units: 50,
    priceRange: '₹1.2Cr – ₹2.5Cr',
    status: 'Active',
    leadCount: 18,
    description: 'Grade-A commercial offices in prime Surat business district.',
  },
  {
    id: 'p4',
    name: 'Vistara Bliss',
    location: 'Vadodara, Gujarat',
    type: 'Residential',
    units: 96,
    priceRange: '₹55L – ₹95L',
    status: 'Upcoming',
    leadCount: 12,
    description: 'Luxury 3 & 4 BHK residences with rooftop garden.',
  },
  {
    id: 'p5',
    name: 'Emerald Gardens',
    location: 'Rajkot, Gujarat',
    type: 'Residential',
    units: 64,
    priceRange: '₹40L – ₹70L',
    status: 'Active',
    leadCount: 21,
    description: 'Gated community with 24/7 security and landscaped gardens.',
  },
];

export const LEADS = [
  {
    id: 'l1',
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'rajesh.sharma@gmail.com',
    projectId: 'p1',
    projectName: 'Vistara Heights',
    source: 'Walk-in',
    status: 'Warm',
    assignedTo: 'Arun Kumar',
    budget: '₹60L – ₹70L',
    notes: 'Interested in 2BHK on higher floors. Wants site visit this weekend.',
    timeAgo: '2h ago',
    createdAt: '20 May 2026',
    activities: [
      { id: 'a1', type: 'Enquiry', note: 'Walk-in enquiry at site office.', time: '20 May, 10:30 AM' },
      { id: 'a2', type: 'Call', note: 'Follow-up call — confirmed interest in 2BHK.', time: '21 May, 11:00 AM' },
      { id: 'a3', type: 'Status Change', note: 'Status updated to Warm.', time: '21 May, 2:00 PM' },
    ],
  },
  {
    id: 'l2',
    name: 'Priya Mehta',
    phone: '+91 87654 32109',
    email: 'priya.mehta@gmail.com',
    projectId: 'p2',
    projectName: 'Green Valley Residency',
    source: 'Online',
    status: 'New',
    assignedTo: 'Neha Shah',
    budget: '₹55L – ₹65L',
    notes: 'Enquired about 3BHK options via website.',
    timeAgo: '4h ago',
    createdAt: '21 May 2026',
    activities: [
      { id: 'a1', type: 'Enquiry', note: 'Online enquiry received via website form.', time: '21 May, 9:00 AM' },
    ],
  },
  {
    id: 'l3',
    name: 'Amit Patel',
    phone: '+91 76543 21098',
    email: 'amit.patel@gmail.com',
    projectId: 'p1',
    projectName: 'Vistara Heights',
    source: 'Reference',
    status: 'Cold',
    assignedTo: 'Arun Kumar',
    budget: '₹45L – ₹55L',
    notes: 'Referred by Rajesh Sharma. Undecided on budget.',
    timeAgo: '1d ago',
    createdAt: '20 May 2026',
    activities: [
      { id: 'a1', type: 'Call', note: 'Called twice, not responding.', time: '20 May, 3:00 PM' },
    ],
  },
  {
    id: 'l4',
    name: 'Sunita Joshi',
    phone: '+91 65432 10987',
    email: 'sunita.joshi@gmail.com',
    projectId: 'p3',
    projectName: 'Skyline Business Park',
    source: 'Phone',
    status: 'Lost',
    assignedTo: 'Karan Desai',
    budget: '₹1.5Cr – ₹2Cr',
    notes: 'Went with competitor project in same area.',
    timeAgo: '2d ago',
    createdAt: '19 May 2026',
    activities: [
      { id: 'a1', type: 'Call', note: 'Interested in commercial unit.', time: '19 May, 2:00 PM' },
      { id: 'a2', type: 'Status Change', note: 'Status changed to Lost — opted for competitor.', time: '20 May, 5:00 PM' },
    ],
  },
  {
    id: 'l5',
    name: 'Vivek Nair',
    phone: '+91 54321 09876',
    email: 'vivek.nair@gmail.com',
    projectId: 'p4',
    projectName: 'Vistara Bliss',
    source: 'Walk-in',
    status: 'Warm',
    assignedTo: 'Neha Shah',
    budget: '₹80L – ₹95L',
    notes: 'Looking for 4BHK, confirmed for site visit Monday.',
    timeAgo: '3d ago',
    createdAt: '18 May 2026',
    activities: [
      { id: 'a1', type: 'Walk-in', note: 'Visited gallery office.', time: '18 May, 4:00 PM' },
      { id: 'a2', type: 'Call', note: 'Brochure shared, very interested.', time: '19 May, 10:00 AM' },
      { id: 'a3', type: 'Status Change', note: 'Status updated to Warm.', time: '20 May, 12:00 PM' },
    ],
  },
  {
    id: 'l6',
    name: 'Deepa Rao',
    phone: '+91 43210 98765',
    email: 'deepa.rao@gmail.com',
    projectId: 'p5',
    projectName: 'Emerald Gardens',
    source: 'Online',
    status: 'New',
    assignedTo: 'Karan Desai',
    budget: '₹40L – ₹50L',
    notes: 'First-time buyer, needs detailed info.',
    timeAgo: '3d ago',
    createdAt: '18 May 2026',
    activities: [
      { id: 'a1', type: 'Enquiry', note: 'Enquired via social media ad.', time: '18 May, 1:00 PM' },
    ],
  },
  {
    id: 'l7',
    name: 'Rohan Gupta',
    phone: '+91 32109 87654',
    email: 'rohan.gupta@gmail.com',
    projectId: 'p2',
    projectName: 'Green Valley Residency',
    source: 'Reference',
    status: 'Cold',
    assignedTo: 'Arun Kumar',
    budget: '₹35L – ₹45L',
    notes: 'Waiting for bank loan approval.',
    timeAgo: '5d ago',
    createdAt: '16 May 2026',
    activities: [
      { id: 'a1', type: 'Call', note: 'Interested but waiting for home loan.', time: '16 May, 3:30 PM' },
    ],
  },
];

export const STATUS_META = {
  New:  { color: '#1565C0', bg: '#E3F2FD', label: 'New' },
  Cold: { color: '#37474F', bg: '#ECEFF1', label: 'Cold' },
  Warm: { color: '#E65100', bg: '#FFF3E0', label: 'Warm' },
  Lost: { color: '#B71C1C', bg: '#FFEBEE', label: 'Lost' },
};

export const PROJECT_TYPE_META = {
  Residential: { color: '#1B5E20', bg: '#E8F5E9' },
  Commercial:  { color: '#0D47A1', bg: '#E3F2FD' },
};

export const SOURCES = ['Walk-in', 'Phone', 'Online', 'Reference', 'Email'];
export const STATUSES = ['New', 'Cold', 'Warm', 'Lost'];
export const PROJECT_TYPES = ['Residential', 'Commercial', 'Mixed'];
export const PROJECT_STATUSES = ['Active', 'Upcoming', 'Completed'];

export const TEAM_MEMBERS = [
  { id: 't1', name: 'Arun Kumar',  role: 'STM',             leadCount: 12, initials: 'AK' },
  { id: 't2', name: 'Neha Shah',   role: 'Sales Executive', leadCount: 8,  initials: 'NS' },
  { id: 't3', name: 'Karan Desai', role: 'Sales Executive', leadCount: 10, initials: 'KD' },
  { id: 't4', name: 'Priti Mehta', role: 'STM',             leadCount: 7,  initials: 'PM' },
  { id: 't5', name: 'Ravi Joshi',  role: 'Sales Executive', leadCount: 5,  initials: 'RJ' },
];

let _rrIndex = 0;
export const getNextAssignee = () => {
  const person = TEAM_MEMBERS[_rrIndex % TEAM_MEMBERS.length];
  _rrIndex = (_rrIndex + 1) % TEAM_MEMBERS.length;
  return person;
};
