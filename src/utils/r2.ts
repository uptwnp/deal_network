import { supabase } from '../services/supabase';

/**
 * Uploads a file to Cloudflare R2 securely via a Supabase Edge Function.
 * This hides the R2 Secret Key from the browser.
 */
export async function uploadToR2(file: File): Promise<string> {
  // 1. Get a secure, temporary presigned upload URL from our Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('r2-upload-v1', {
    body: { 
      filename: file.name, 
      contentType: file.type || 'image/jpeg' 
    }
  });

  if (error || !data?.uploadUrl) {
    console.error('Edge Function Error:', error);
    throw new Error('Could not get secure upload URL');
  }

  const { uploadUrl, publicUrl } = data;

  // 2. Upload the file directly to R2 using the presigned URL
  // We don't need to pass the Secret Key here; the URL is already signed by the server.
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 Upload failed: ${response.status} ${errorText}`);
  }

  // 3. Return the public CDN URL for the uploaded image
  return publicUrl;
}

