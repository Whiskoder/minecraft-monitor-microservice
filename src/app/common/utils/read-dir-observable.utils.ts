import { readdir } from 'node:fs';
import { promisify } from 'node:util';
import { from, Observable } from 'rxjs';

export const readDirObservable = (path: string): Observable<string[]> => {
  const readDirAsync = promisify(readdir);
  return from(readDirAsync(path));
};
