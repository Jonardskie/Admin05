import { NextResponse } from "next/server";
// Dynamic Firebase imports to avoid build-time env check

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
const { adminAuth, adminDb } = await import('@/lib/firebase-admin');
const { getAuth } = await import('firebase-admin/auth');
const decodedToken = await getAuth().verifyIdToken(idToken);

const adminDoc = await adminDb().collection("users").doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

await adminAuth().deleteUser(uid);
await adminDb().collection("users").doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete user error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}