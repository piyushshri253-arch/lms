'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApp } from './AppContext';
import {
  hasAdminPermission,
  hasAnyAdminPermission,
  extractUserPermissions,
  AdminPermissionKey
} from '@/lib/admin-permissions';

export interface Facility {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface AdminContextType {
  activeFacility: Facility | null;
  facilities: Facility[];
  isLoadingFacilities: boolean;
  switchFacility: (facilityId: string) => void;
  permissions: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  hasPermission: (key: AdminPermissionKey | string) => boolean;
  hasAnyPermission: (keys: Array<AdminPermissionKey | string>) => boolean;
  refreshFacilities: () => Promise<void>;
}

const defaultCompanyFacility: Facility = {
  id: 'main',
  name: 'MORENA TEACH LMS',
  slug: 'morena-teach'
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';

  // Extract user permissions
  const permissions = extractUserPermissions(currentUser);

  const hasPerm = (key: AdminPermissionKey | string) => {
    return hasAdminPermission(currentUser, key);
  };

  const hasAnyPerm = (keys: Array<AdminPermissionKey | string>) => {
    return hasAnyAdminPermission(currentUser, keys);
  };

  const dummyRefresh = async () => {};

  return (
    <AdminContext.Provider
      value={{
        activeFacility: defaultCompanyFacility,
        facilities: [defaultCompanyFacility],
        isLoadingFacilities: false,
        switchFacility: () => {},
        permissions,
        isSuperAdmin,
        isAdmin,
        hasPermission: hasPerm,
        hasAnyPermission: hasAnyPerm,
        refreshFacilities: dummyRefresh
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
