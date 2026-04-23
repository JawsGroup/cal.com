"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";

type TeamMembersPageProps = {
  teamId: number;
  isOwner: boolean;
};

const ROLE_OPTIONS = [
  { value: MembershipRole.MEMBER, label: "Member" },
  { value: MembershipRole.ADMIN, label: "Admin" },
  { value: MembershipRole.OWNER, label: "Owner" },
];

export default function TeamMembersPage({ teamId, isOwner }: TeamMembersPageProps) {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>(MembershipRole.MEMBER);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = trpc.viewer.teams.listMembers.useQuery({
    teamId,
    limit: 100,
    searchTerm: searchTerm || undefined,
  });

  const inviteMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess(result) {
      showToast(`${result.numUsersInvited} membre(s) invit\u00e9(s)`, "success");
      setInviteEmail("");
      utils.viewer.teams.listMembers.invalidate();
    },
    onError(error) {
      showToast(error.message, "error");
    },
  });

  const changeRoleMutation = trpc.viewer.teams.changeMemberRole.useMutation({
    onSuccess() {
      showToast(t("profile_updated_successfully"), "success");
      utils.viewer.teams.listMembers.invalidate();
    },
    onError(error) {
      showToast(error.message, "error");
    },
  });

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    onSuccess() {
      showToast(t("success"), "success");
      utils.viewer.teams.listMembers.invalidate();
    },
    onError(error) {
      showToast(error.message, "error");
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({
      teamId,
      usernameOrEmail: inviteEmail.trim(),
      role: inviteRole,
      language: i18n.language,
      creationSource: CreationSource.WEBAPP,
    });
  };

  const handleRemove = (memberId: number) => {
    if (!confirm(t("confirm_remove_member"))) return;
    removeMemberMutation.mutate({
      teamIds: [teamId],
      memberIds: [memberId],
    });
  };

  const handleRoleChange = (memberId: number, newRole: MembershipRole) => {
    changeRoleMutation.mutate({
      teamId,
      memberId,
      role: newRole,
    });
  };

  const members = data?.members ?? [];

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="rounded-lg border border-subtle bg-default p-4">
          <h3 className="text-emphasis mb-3 text-sm font-medium">{t("invite_team_member")}</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder={t("email")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="w-36">
              <Select
                options={ROLE_OPTIONS}
                value={ROLE_OPTIONS.find((o) => o.value === inviteRole)}
                onChange={(selected) => selected && setInviteRole(selected.value as MembershipRole)}
                isSearchable={false}
              />
            </div>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending || !inviteEmail.trim()}>
              {inviteMutation.isPending ? "..." : t("invite")}
            </Button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-3">
          <Input
            type="text"
            placeholder={t("search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-subtle py-8 text-center text-sm">{t("loading")}</div>
        ) : members.length === 0 ? (
          <div className="text-subtle py-8 text-center text-sm">{t("no_members_found")}</div>
        ) : (
          <ul className="divide-subtle divide-y rounded-lg border border-subtle">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    size="sm"
                    alt={member.name || member.username || ""}
                    imageSrc={member.avatarUrl || undefined}
                  />
                  <div>
                    <p className="text-emphasis text-sm font-medium">
                      {member.name || member.username}
                    </p>
                    <p className="text-subtle text-xs">{member.email}</p>
                  </div>
                  {!member.accepted && (
                    <Badge variant="orange">{t("pending")}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <div className="w-32">
                      <Select
                        options={ROLE_OPTIONS}
                        value={ROLE_OPTIONS.find((o) => o.value === member.role)}
                        onChange={(selected) =>
                          selected && handleRoleChange(member.id, selected.value as MembershipRole)
                        }
                        isSearchable={false}
                      />
                    </div>
                  ) : (
                    <Badge variant="gray">{member.role}</Badge>
                  )}

                  {isOwner && (
                    <button
                      type="button"
                      className="rounded-md p-1 hover:bg-red-100"
                      onClick={() => handleRemove(member.id)}
                      disabled={removeMemberMutation.isPending}>
                      <Icon name="trash-2" className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {data?.meta && (
          <p className="text-subtle mt-2 text-xs">
            {data.meta.totalRowCount} {t("members")}
          </p>
        )}
      </div>
    </div>
  );
}
