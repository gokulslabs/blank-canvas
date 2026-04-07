import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Trash2, Mail, Shield } from "lucide-react";
import { organizationMemberRepo, OrganizationMember } from "@/repositories/organizationMemberRepo";
import { invitationRepo, Invitation } from "@/repositories/invitationRepo";

export default function TeamMembers() {
  const { currentOrg } = useApp();
  const { user } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "accountant">("accountant");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwner = members.some(
    (m) => m.userId === user?.id && m.role === "owner"
  );

  const loadData = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [m, inv] = await Promise.all([
        organizationMemberRepo.findByOrg(currentOrg.id),
        invitationRepo.findByOrg(currentOrg.id).catch(() => [] as Invitation[]),
      ]);
      setMembers(m);
      setInvitations(inv);
    } catch (err) {
      console.error("Failed to load team data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user || !inviteEmail.trim() || submitting) return;

    const email = inviteEmail.toLowerCase().trim();

    // Check if already a member
    if (members.some((m) => m.userId === user.id && email === user.email)) {
      toast.error("Cannot invite yourself");
      return;
    }

    // Check if already invited
    if (invitations.some((inv) => inv.email === email && inv.status === "pending")) {
      toast.error("This email already has a pending invitation");
      return;
    }

    setSubmitting(true);
    try {
      await invitationRepo.create({
        email,
        organizationId: currentOrg.id,
        role: inviteRole,
        invitedBy: user.id,
      });
      toast.success(`Invitation sent to ${email}`);
      setInviteEmail("");
      setInviteRole("accountant");
      setInviteOpen(false);
      await loadData();
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error("This email has already been invited to this organization");
      } else {
        toast.error("Failed to send invitation");
        console.error("Invite error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await invitationRepo.revoke(id);
      toast.success("Invitation revoked");
      await loadData();
    } catch (err) {
      toast.error("Failed to revoke invitation");
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast.error("You cannot remove yourself");
      return;
    }
    try {
      await organizationMemberRepo.remove(memberId);
      toast.success("Member removed");
      await loadData();
    } catch (err) {
      toast.error("Failed to remove member");
      console.error(err);
    }
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");
  const acceptedInvitations = invitations.filter((inv) => inv.status === "accepted");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your organization's team and invitations
            </p>
          </div>
          {isOwner && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" /> Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "owner" | "accountant")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accountant">Accountant (view & edit data)</SelectItem>
                        <SelectItem value="owner">Owner (full access + manage team)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Invitation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Members</p>
              </div>
              <p className="text-2xl font-bold mt-1">{members.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
              <p className="text-2xl font-bold mt-1 text-warning">{pendingInvitations.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Your Role</p>
              </div>
              <p className="text-2xl font-bold mt-1 capitalize">
                {members.find((m) => m.userId === user?.id)?.role || "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Members</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No members found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {isOwner && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-xs font-mono">
                        {m.userId === user?.id ? (
                          <span>{user.email} <Badge variant="outline" className="ml-2 text-xs">You</Badge></span>
                        ) : (
                          m.userId.slice(0, 8) + "..."
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.role === "owner" ? "default" : "secondary"} className="capitalize">
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          {m.userId !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(m.id, m.userId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {isOwner && pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{inv.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevoke(inv.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
