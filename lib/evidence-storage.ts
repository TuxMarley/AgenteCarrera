import { getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const storeName = 'evidence-files';

function localFilePath(key:string) {
  const safeSegments = key.split('/').filter((segment) => segment && segment !== '.' && segment !== '..');
  return path.join(process.cwd(), '.data', 'files', ...safeSegments);
}

export async function saveEvidenceFile(key:string, file:File, ownerId:string) {
  const data = await file.arrayBuffer();
  if (process.env.NETLIFY === 'true') {
    await getStore(storeName).set(key, data, { metadata:{ ownerId, contentType:file.type } });
    return;
  }

  const filePath = localFilePath(key);
  await mkdir(path.dirname(filePath), { recursive:true });
  await writeFile(filePath, Buffer.from(data));
}

export async function readEvidenceFile(key:string) {
  if (process.env.NETLIFY === 'true') {
    return getStore(storeName).get(key, { type:'arrayBuffer', consistency:'strong' });
  }

  try {
    const data = await readFile(localFilePath(key));
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw error;
  }
}
