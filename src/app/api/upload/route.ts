import { NextResponse } from "next/server";
import { s3 } from "@/lib/s3";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fileType,
      fileName,
      folder,
    } = body;

    const uniqueFileName =
      `${folder}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: uniqueFileName,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(
      s3,
      command,
      {
        expiresIn: 60,
      }
    );

    const fileUrl =
      `${process.env.NEXT_PUBLIC_AWS_BUCKET_URL}/${uniqueFileName}`;

    return NextResponse.json({
      signedUrl,
      fileUrl,
    });

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        error: "Upload URL generation failed",
      },
      {
        status: 500,
      }
    );
  }
}