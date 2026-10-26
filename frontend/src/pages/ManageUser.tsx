import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import DeleteUserDialog from "@/user/DeleteUserDialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// User API
import {
  getAllUsers,
  ChangeUserRole,
  deleteUser as apiDeleteUser,
} from "../api/userApi";

interface User {
  userId: number;
  username: string;
  email: string;
  role: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 🔥 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  // --------------------------------------------------
  // 🔍 FILTERING
  // --------------------------------------------------
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) 
      // u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      // u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --------------------------------------------------
  // 🔢 PAGINATION CALCULATIONS
  // --------------------------------------------------
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // --------------------------------------------------
  // ⬇ CSV DOWNLOAD
  // --------------------------------------------------
  const downloadCSV = (jsonData: any[], filename = "users.csv") => {
    if (!jsonData || jsonData.length === 0) {
      toast.error("No user data available to download!");
      return;
    }

    const headers = Object.keys(jsonData[0]);
    const csvRows: string[] = [];

    csvRows.push(headers.join(","));

    jsonData.forEach((item) => {
      const values = headers.map((header) => `"${item[header] ?? ""}"`);
      csvRows.push(values.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    window.URL.revokeObjectURL(url);
    toast.success("CSV downloaded successfully!");
  };

  // --------------------------------------------------
  // 📌 FETCH USERS FROM BACKEND
  // --------------------------------------------------

  const fetchUsers = async () => {
  try {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data); 
  } catch {
    toast.error("Failed to load users");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchUsers();
  }, []);

  // --------------------------------------------------
  // 🔄 UPDATE ROLE
  // --------------------------------------------------
  // const updateRole = async (user: User, newRole: string) => {
  //   try {
  //    const response=await ChangeUserRole(user.userId,{Role:newRole});
  //    toast.success(response.data);
  //     })

  //     setUsers((prev) =>
  //       prev.map((u) =>
  //         u.userId === user.userId ? { ...u, role: newRole } : u
  //       )
  //     );

  //     toast.success("User role updated!");
  //   } catch (err) {
  //     console.error("Error updating user:", err);
  //     toast.error("Failed to update user role.");
  //   }
  // };
const updateRole = async (user: User, newRole: string) => {
  try {
    await ChangeUserRole(user.userId, { Role: newRole });
    await fetchUsers();
    toast.success("User role updated successfully");
  } catch (error: any) {
    toast.error(error.message);
  }
};

  // --------------------------------------------------
  // ❌ DELETE USER
  // --------------------------------------------------
  const handleDeleteUser = async (id: number) => {
    try {
      await apiDeleteUser(id);
      setUsers((prev) => prev.filter((u) => u.userId !== id));
      toast.success("User deleted successfully!");
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Failed to delete user.");
    }
  };

  // --------------------------------------------------
  // JSX
  // --------------------------------------------------
  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">Manage application users</p>
      </div>

      {/* Search + CSV */}
      <div className="flex items-center gap-3 sm:justify-between">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            id="user-search"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-md bg-background text-foreground"
          />
        </div>

        {isAdmin && (
          <Button
            id="download-csv-btn"
            onClick={() =>
              downloadCSV(
                filteredUsers.map((u) => ({
                  username: u.username,
                  email: u.email,
                  role: u.role,
                })),
                "users.csv"
              )
            }
          >
            Download CSV
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-muted-foreground">Loading users...</div>
      )}

      {/* Error */}
      {error && <div className="text-center text-destructive">{error}</div>}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table id="user-table" className="w-full text-sm text-foreground">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-4 text-left font-semibold">User</th>

              <th className="p-4 text-center font-semibold hidden sm:table-cell">
                Email
              </th>

              <th className="p-4 text-center font-semibold hidden sm:table-cell">
                Role
              </th>

              {isAdmin && (
                <th className="p-4 text-center font-semibold hidden sm:table-cell">
                  Actions
                </th>
              )}
            </tr>
          </thead>


          <tbody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((u) => (
                <tr
  key={u.userId}
  className="border-t border-border hover:bg-muted/20"
>
  {/* USER INFO (Always visible) */}
  <td className="p-4 text-left">
    <div className="flex flex-col">
      <span className="font-medium">{u.username}</span>
      <span className="text-xs text-muted-foreground sm:hidden">
        {u.email}
      </span>
    </div>
  </td>

  {/* EMAIL (Desktop only) */}
  <td className="p-4 text-center hidden sm:table-cell">
    {u.email}
  </td>

  {/* ROLE (Desktop only) */}
  <td className="p-4 text-center hidden sm:table-cell">
    {isAdmin ? (
      <select
        value={u.role}
        onChange={(e) => updateRole(u, e.target.value)}
        disabled={
          u.email === user?.email ||
          u.email === "admin@example.com"
        }
        className="role-dropdown border border-border rounded-md bg-background px-2 py-1"
      >
        <option>User</option>
        <option>Engineer</option>
        <option>Operator</option>
        <option>Admin</option>
      </select>
    ) : (
      u.role
    )}
  </td>

  {/* ACTIONS (Desktop only) */}
  {isAdmin && (
    <td className="p-4 text-center hidden sm:table-cell">
      <Button
        variant="destructive"
        size="sm"
        className="delete-user-btn"
        onClick={() => {
          if (u.email === user?.email) {
            toast.error("You cannot delete your own account!");
            return;
          }
          if (u.email === "admin@example.com") {
            toast.error("You cannot delete main admin account");
            return;
          }
          setSelectedUser(u);
          setShowDeleteDialog(true);
        }}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
    </td>
  )}

  {/* 🔥 MOBILE ACTION COLUMN */}
  {isAdmin && (
    <td className="p-4 sm:hidden">
      <div className="flex flex-col gap-2">
        <select
          value={u.role}
          onChange={(e) => updateRole(u, e.target.value)}
          disabled={
            u.email === user?.email ||
            u.email === "admin@example.com"
          }
          className=" role-dropdown border border-border rounded-md bg-background px-2 py-1 text-sm"
        >
          <option>User</option>
          <option>Engineer</option>
          <option>Operator</option>
          <option>Admin</option>
        </select>

        <Button
          variant="destructive"
          size="sm"
          className="delete-user-btn"
          onClick={() => {
            if (u.email === user?.email) {
              toast.error("You cannot delete your own account!");
              return;
            }
            if (u.email === "admin@example.com") {
              toast.error("You cannot delete main admin account");
              return;
            }
            setSelectedUser(u);
            setShowDeleteDialog(true);
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </td>
  )}
</tr>

              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="text-center p-6 text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      )}

      {/* Pagination UI - ShadCN */}
      <Pagination className="justify-center mt-6">
      <PaginationContent>

        {/* Previous */}
        <PaginationItem>
          <PaginationPrevious
            href="#"
            disabled={currentPage === 1}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) {
                setCurrentPage((prev) => prev - 1);
              }
            }}
          />
        </PaginationItem>

        {/* Page Numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <PaginationItem key={num}>
            <PaginationLink
              href="#"
              isActive={num === currentPage}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(num);
              }}
            >
              {num}
            </PaginationLink>
          </PaginationItem>
        ))}

        {/* Ellipsis */}
        {totalPages > 5 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {/* Next */}
        <PaginationItem>
          <PaginationNext
            href="#"
            disabled={currentPage === totalPages}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) {
                setCurrentPage((prev) => prev + 1);
              }
            }}
          />
        </PaginationItem>

      </PaginationContent>
    </Pagination>


      {/* Delete Dialog */}
      {showDeleteDialog && selectedUser && (
        <DeleteUserDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          user={selectedUser}
          onDeleted={(id) =>
            setUsers((prev) => prev.filter((u) => u.userId !== id))
          }
        />
      )}
    </div>
  );
}
