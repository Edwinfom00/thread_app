import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";

import { IncomingHttpHeaders } from "http";
import {
  addMemberToCommunity,
  createCommunity,
  deleteCommunity,
  removeUserFromCommunity,
  updateCommunityInfo,
} from "@/lib/actions/community.actions";

type EventType =
  | "organization.created"
  | "organizationInvitation.created"
  | "organizationMembership.created"
  | "organizationMembership.deleted"
  | "organization.updated"
  | "organization.deleted";

type EventData = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  image_url?: string;
  created_by: string;
  organization?: { id: string };
  public_user_data?: { user_id: string };
};

type Event = {
  data: EventData;
  object: "event";
  type: EventType;
};

export const POST = async (request: Request) => {
  const payload = await request.json();
  const header = headers();

  const heads = {
    "svix-id": header.get("svix-id"),
    "svix-timestamp": header.get("svix-timestamp"),
    "svix-signature": header.get("svix-signature"),
  };

  const wh = new Webhook(process.env.NEXT_CLERK_WEBHOOK_SECRET || "");

  let evnt: Event | null = null;

  try {
    evnt = wh.verify(
      JSON.stringify(payload),
      heads as WebhookRequiredHeaders
    ) as Event;
  } catch (err) {
    return NextResponse.json(
      { message: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const eventType: EventType = evnt?.type!;

  // Handle different event types
  if (eventType === "organization.created") {
    const { id, name, slug, logo_url, image_url, created_by } = evnt.data;

    if (!id || !name || !slug || !created_by) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    try {
      await createCommunity(
        id,
        name,
        slug,
        logo_url || image_url || "",
        "org bio",
        created_by
      );

      return NextResponse.json(
        { message: "Organization created" },
        { status: 201 }
      );
    } catch (err) {
      console.error("Error creating organization:", err);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  if (eventType === "organizationInvitation.created") {
    console.log("Invitation created", evnt?.data);

    return NextResponse.json(
      { message: "Invitation created" },
      { status: 201 }
    );
  }

  if (eventType === "organizationMembership.created") {
    const { organization, public_user_data } = evnt.data;

    if (!organization?.id || !public_user_data?.user_id) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    try {
      await addMemberToCommunity(organization.id, public_user_data.user_id);

      return NextResponse.json(
        { message: "Membership created" },
        { status: 201 }
      );
    } catch (err) {
      console.error("Error adding member to community:", err);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  if (eventType === "organizationMembership.deleted") {
    const { organization, public_user_data } = evnt.data;

    if (!organization?.id || !public_user_data?.user_id) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    try {
      await removeUserFromCommunity(public_user_data.user_id, organization.id);

      return NextResponse.json(
        { message: "Membership deleted" },
        { status: 201 }
      );
    } catch (err) {
      console.error("Error removing member from community:", err);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  if (eventType === "organization.updated") {
    const { id, logo_url, name, slug } = evnt.data;

    if (!id || !name || !slug) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    try {
      await updateCommunityInfo(id, name, slug, logo_url || "");

      return NextResponse.json(
        { message: "Organization updated" },
        { status: 201 }
      );
    } catch (err) {
      console.error("Error updating organization:", err);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  if (eventType === "organization.deleted") {
    const { id } = evnt.data;

    if (!id) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    try {
      await deleteCommunity(id);

      return NextResponse.json(
        { message: "Organization deleted" },
        { status: 201 }
      );
    } catch (err) {
      console.error("Error deleting organization:", err);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { message: "Event type not handled" },
    { status: 400 }
  );
};
