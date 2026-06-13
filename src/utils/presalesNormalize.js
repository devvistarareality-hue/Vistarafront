export const normalizeLead = (lead) => ({
  id:           String(lead.id),
  name:         lead.name || '',
  phone:        lead.phone || '',
  email:        lead.email || '',
  projectId:    lead.project ? String(lead.project) : '',
  projectName:  lead.project_name || '',
  source:       lead.source || '',
  status:       lead.status || 'New',
  assignedTo:   lead.assigned_to_name || '',
  assignedToId: lead.assigned_to ? String(lead.assigned_to) : '',
  budget:        lead.budget || '',
  notes:         lead.notes || '',
  nextFollowup:  lead.next_followup || null,
  timeAgo:      lead.time_ago || '',
  createdAt:    lead.created_at_str || '',
  activities:   (lead.activities || []).map((a) => ({
    id:   String(a.id),
    type: a.type,
    note: a.note,
    time: a.time,
  })),
});

export const normalizeProject = (proj) => ({
  id:          String(proj.id),
  name:        proj.name || '',
  location:    proj.location || '',
  type:        proj.type || 'Residential',
  units:       proj.units || 0,
  priceRange:  proj.price_range || '',
  status:      proj.status || 'Active',
  description: proj.description || '',
  leadCount:   proj.lead_count || 0,
});

export const normalizeTeam = (m) => ({
  id:        String(m.id),
  name:      m.name || '',
  role:      m.role || '',
  initials:  m.initials || (m.name ? m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '??'),
  leadCount: m.lead_count || 0,
});
