// Who can see and change what. The UI asks these functions instead of checking roles itself.
import { DEPARTMENTS } from './labels';
import type { Department, Person, TaskTemplate } from './types';

/** hr_admin sees everyone; a manager sees only their direct reports; a new hire sees only themselves. */
export function canView(viewer: Person, person: Person): boolean {
  switch (viewer.role) {
    case 'hr_admin':
      return true;
    case 'manager':
      return person.managerId === viewer.id;
    case 'new_hire':
      return person.id === viewer.id;
  }
}

/** hr_admin, or the person's own manager. */
export function canEditPlan(viewer: Person, person: Person): boolean {
  return viewer.role === 'hr_admin' || (viewer.role === 'manager' && person.managerId === viewer.id);
}

/** Only HR adds hires. */
export function canAddNewHire(viewer: Person): boolean {
  return viewer.role === 'hr_admin';
}

/** HR and managers can open the Templates tab; new hires cannot. */
export function canViewTemplates(viewer: Person): boolean {
  return viewer.role === 'hr_admin' || viewer.role === 'manager';
}

/** Template groups the viewer sees: HR all; a manager company-wide (read-only) plus their own department. */
export function getVisibleTemplateDepartments(viewer: Person): (Department | 'all')[] {
  if (viewer.role === 'hr_admin') return ['all', ...DEPARTMENTS];
  if (viewer.role === 'manager') return ['all', viewer.department];
  return [];
}

/** HR can create templates for any department or company-wide; a manager only for their own department. */
export function canCreateTemplate(viewer: Person, department: Department | 'all'): boolean {
  if (viewer.role === 'hr_admin') return true;
  return viewer.role === 'manager' && department === viewer.department;
}

/** Same rule as creating: edit and archive within the departments you own. */
export function canEditTemplate(viewer: Person, template: Pick<TaskTemplate, 'department'>): boolean {
  return canCreateTemplate(viewer, template.department);
}
