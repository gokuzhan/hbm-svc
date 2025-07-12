// RBAC Components Tests

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Mock the hooks
jest.mock('@/lib/rbac/hooks', () => ({
  usePermissionGate: jest.fn(),
  useRoleGate: jest.fn(),
  useIsAuthenticated: jest.fn(),
}));

import {
  PermissionButton,
  PermissionDisable,
  PermissionGate,
  PermissionHide,
  PermissionSwitch,
} from '@/lib/rbac/components';
import { useIsAuthenticated, usePermissionGate, useRoleGate } from '@/lib/rbac/hooks';

const mockUsePermissionGate = usePermissionGate as jest.MockedFunction<typeof usePermissionGate>;
const mockUseRoleGate = useRoleGate as jest.MockedFunction<typeof useRoleGate>;
const mockUseIsAuthenticated = useIsAuthenticated as jest.MockedFunction<typeof useIsAuthenticated>;

describe('RBAC Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PermissionGate', () => {
    it('should render children when user has permission', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionGate permission="users:read">
          <div>Protected content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should not render children when user lacks permission', () => {
      mockUsePermissionGate.mockReturnValue(false);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionGate permission="users:delete">
          <div>Protected content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should render fallback when provided and user lacks permission', () => {
      mockUsePermissionGate.mockReturnValue(false);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionGate permission="users:delete" fallback={<div>No permission</div>}>
          <div>Protected content</div>
        </PermissionGate>
      );

      expect(screen.getByText('No permission')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should render children when user has required role', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionGate role="admin">
          <div>Admin content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Admin content')).toBeInTheDocument();
    });

    it('should require both permission and role when both are specified', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(false);

      render(
        <PermissionGate permission="users:read" role="admin">
          <div>Admin user content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Admin user content')).not.toBeInTheDocument();
    });

    it('should render when both permission and role requirements are met', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionGate permission="users:read" role="admin">
          <div>Admin user content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Admin user content')).toBeInTheDocument();
    });
  });

  describe('PermissionButton', () => {
    it('should render enabled button when user has permission', () => {
      mockUsePermissionGate.mockReturnValue(true);

      render(<PermissionButton permission="users:create">Create User</PermissionButton>);

      const button = screen.getByRole('button', { name: 'Create User' });
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should render disabled button when user lacks permission', () => {
      mockUsePermissionGate.mockReturnValue(false);

      render(<PermissionButton permission="users:delete">Delete User</PermissionButton>);

      const button = screen.getByRole('button', { name: 'Delete User' });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('should not render button when hideIfNoAccess is true and user lacks permission', () => {
      mockUsePermissionGate.mockReturnValue(false);

      render(
        <PermissionButton permission="users:delete" hideIfNoAccess>
          Delete User
        </PermissionButton>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('PermissionHide', () => {
    it('should render children when user has permission', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionHide permission="users:read">
          <div>Hidden content</div>
        </PermissionHide>
      );

      expect(screen.getByText('Hidden content')).toBeInTheDocument();
    });

    it('should hide children when user lacks permission', () => {
      mockUsePermissionGate.mockReturnValue(false);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionHide permission="users:delete">
          <div>Hidden content</div>
        </PermissionHide>
      );

      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });
  });

  describe('PermissionSwitch', () => {
    it('should render authorized content when user has permission', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionSwitch
          permission="users:read"
          authorized={<div>Authorized content</div>}
          unauthorized={<div>Unauthorized content</div>}
        />
      );

      expect(screen.getByText('Authorized content')).toBeInTheDocument();
      expect(screen.queryByText('Unauthorized content')).not.toBeInTheDocument();
    });

    it('should render unauthorized content when user lacks permission', () => {
      mockUsePermissionGate.mockReturnValue(false);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionSwitch
          permission="users:delete"
          authorized={<div>Authorized content</div>}
          unauthorized={<div>Unauthorized content</div>}
        />
      );

      expect(screen.getByText('Unauthorized content')).toBeInTheDocument();
      expect(screen.queryByText('Authorized content')).not.toBeInTheDocument();
    });
  });

  describe('PermissionDisable', () => {
    it('should render children normally when user has permission', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionDisable permission="users:read">
          <button>Test Button</button>
        </PermissionDisable>
      );

      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should disable children when user lacks permission', () => {
      mockUsePermissionGate.mockReturnValue(false);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionDisable permission="users:delete">
          <button>Test Button</button>
        </PermissionDisable>
      );

      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle authentication requirement with no permission or role', () => {
      mockUseIsAuthenticated.mockReturnValue(true);

      render(
        <PermissionGate>
          <div>Authenticated content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Authenticated content')).toBeInTheDocument();
    });

    it('should hide content when not authenticated and no permission/role specified', () => {
      mockUseIsAuthenticated.mockReturnValue(false);

      render(
        <PermissionGate>
          <div>Authenticated content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Authenticated content')).not.toBeInTheDocument();
    });

    it('should handle complex permission scenarios', () => {
      mockUsePermissionGate.mockReturnValue(true);
      mockUseRoleGate.mockReturnValue(true);

      render(
        <PermissionGate permission={['users:read', 'users:write']} requireAll={true}>
          <PermissionButton permission="users:delete">Delete User</PermissionButton>
        </PermissionGate>
      );

      expect(screen.getByRole('button', { name: 'Delete User' })).toBeInTheDocument();
    });
  });
});
