import { UserRoleManager } from '@/components/organisms/admin/UserRoleManager';

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">User Role Management</h1>
      <UserRoleManager />
    </div>
  );
}
