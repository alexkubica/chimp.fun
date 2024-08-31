import axios from 'axios';
import { type NextRequest } from 'next/server';

type ResponseData = {
  message?: string,
  error?: string,
}

export async function GET(
  request: NextRequest
) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url') as string

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    // console.log('Fetching the resource:', url);
    const response = await axios.get(url as string, { responseType: 'arraybuffer' });
    // console.log('Fetched:', response);
    return new Response(response.data, {
      headers: {
        'Content-Type': response.headers['content-type']
      }
    })
  } catch (error) {
    console.error('Error fetching the resource:', (error as Error).message);
    return Response.json({ error: 'Failed to fetch resource' }, { status: 500 })
  }
}