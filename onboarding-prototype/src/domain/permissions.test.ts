import { describe, expect, it } from 'vitest';
import { person } from './fixtures';
import {
  canAddNewHire,
  canCreateTemplate,
  canEditPlan,
  canEditTemplate,
  canView,
  canViewTemplates,
  getVisibleTemplateDepartments,
} from './permissions';

const hr = person({ id: 'hr', role: 'hr_admin', managerId: undefined });
const david = person({ id: 'david', role: 'manager', department: 'engineering', managerId: undefined });
const lena = person({ id: 'lena', role: 'manager', managerId: undefined });
const emily = person({ id: 'emily', managerId: 'david' });
const marcus = person({ id: 'marcus', managerId: 'lena' });

describe('canView', () => {
  it('lets HR see everyone', () => {
    for (const p of [hr, david, lena, emily, marcus]) expect(canView(hr, p)).toBe(true);
  });

  it('lets a manager see only their own reports', () => {
    expect(canView(david, emily)).toBe(true);
    expect(canView(david, marcus)).toBe(false);
    expect(canView(david, lena)).toBe(false);
    expect(canView(lena, marcus)).toBe(true);
  });

  it('lets a new hire see only themselves', () => {
    expect(canView(emily, emily)).toBe(true);
    expect(canView(emily, marcus)).toBe(false);
    expect(canView(emily, david)).toBe(false);
  });
});

describe('canEditPlan', () => {
  it('allows HR and the person’s own manager only', () => {
    expect(canEditPlan(hr, emily)).toBe(true);
    expect(canEditPlan(david, emily)).toBe(true);
    expect(canEditPlan(lena, emily)).toBe(false);
    expect(canEditPlan(emily, emily)).toBe(false);
  });
});

describe('screen access', () => {
  it('limits adding hires to HR and templates to HR and managers', () => {
    expect(canAddNewHire(hr)).toBe(true);
    expect(canAddNewHire(david)).toBe(false);
    expect(canViewTemplates(hr)).toBe(true);
    expect(canViewTemplates(emily)).toBe(false);
  });
});

describe('template permissions', () => {
  it('lets HR create and edit templates for any department or company-wide', () => {
    expect(canCreateTemplate(hr, 'all')).toBe(true);
    expect(canCreateTemplate(hr, 'sales')).toBe(true);
    expect(canEditTemplate(hr, { department: 'engineering' })).toBe(true);
  });

  it('lets a manager edit only their own department, not other departments or company-wide', () => {
    expect(canViewTemplates(david)).toBe(true);
    expect(canCreateTemplate(david, 'engineering')).toBe(true);
    expect(canEditTemplate(david, { department: 'engineering' })).toBe(true);
    expect(canCreateTemplate(david, 'sales')).toBe(false);
    expect(canEditTemplate(david, { department: 'sales' })).toBe(false);
    expect(canCreateTemplate(david, 'all')).toBe(false);
    expect(canEditTemplate(david, { department: 'all' })).toBe(false);
  });

  it('never lets a new hire edit templates', () => {
    expect(canCreateTemplate(emily, 'engineering')).toBe(false);
    expect(canEditTemplate(emily, { department: 'all' })).toBe(false);
  });

  it('shows a manager company-wide plus their own department', () => {
    expect(getVisibleTemplateDepartments(hr)).toEqual(['all', 'engineering', 'sales', 'operations', 'people_ops']);
    expect(getVisibleTemplateDepartments(david)).toEqual(['all', 'engineering']);
    expect(getVisibleTemplateDepartments(emily)).toEqual([]);
  });
});
