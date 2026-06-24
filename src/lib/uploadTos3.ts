export type S3Folder =
  | "recipes"
  | "reels"
  | "profiles/display_picture"
  | "profiles/background_picture"
  | "messages"
  | "campaigns"

export const uploadToS3 = async (
  file: File | Blob,
  folder: S3Folder,
  fileName?: string,
) => {
  const name = fileName ?? (file instanceof File ? file.name : `upload_${Date.now()}`);
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileType: file.type, fileName: name, folder }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Failed to get upload URL");
  }

  const data = await response.json() as { signedUrl: string; fileUrl: string };

  const putRes = await fetch(data.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`);
  }

  return data.fileUrl;
};