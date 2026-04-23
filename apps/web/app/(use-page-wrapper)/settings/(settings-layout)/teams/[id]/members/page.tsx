import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";
import TeamMembersPage from "@calcom/web/modules/teams/views/TeamMembersPage";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/members`
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const t = await getTranslate();
  const { id } = await params;
  const teamId = parseInt(id);

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user.id) {
    return redirect("/auth/login");
  }

  const teamCaller = await createRouterCaller(viewerTeamsRouter);
  const team = await teamCaller.get({ teamId });

  if (!team) {
    throw new Error("Team not found");
  }

  const isOwner = team.membership.role === MembershipRole.OWNER;

  return (
    <SettingsHeader title={t("team_members")} description={t("members_team_description")}>
      <TeamMembersPage teamId={teamId} isOwner={isOwner} />
    </SettingsHeader>
  );
};

export default Page;
