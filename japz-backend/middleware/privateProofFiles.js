import path from 'node:path';

/** Retain legacy originals for import without serving them as public assets. */
export function blockPublicProofFiles(req, res, next) {
  let pathname;
  try { pathname = decodeURIComponent(req.path).replaceAll('\\', '/'); }
  catch { return res.sendStatus(400); }
  pathname = path.posix.normalize(pathname).toLowerCase();
  // Win32 strips trailing dots/spaces from path segments when opening files.
  // Reject those upload aliases before express.static can resolve them, including
  // disguised parent segments such as ".. " and directory stream aliases.
  const windowsSegments = pathname.split('/').map(segment => segment.replace(/[. ]+$/g, ''));
  const windowsPath = path.posix.normalize(windowsSegments.join('/'));
  if (windowsSegments.includes('uploads') &&
      pathname.split('/').some(segment => /[. ]$/.test(segment) || segment.includes(':'))) return res.sendStatus(404);
  if (windowsPath === '/uploads/pod' || windowsPath.startsWith('/uploads/pod/')) return res.sendStatus(404);
  next();
}
