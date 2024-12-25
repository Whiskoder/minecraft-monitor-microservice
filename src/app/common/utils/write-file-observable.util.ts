import { writeFile } from 'node:fs';
import { promisify } from 'node:util';
import { from, Observable } from 'rxjs';

export const writeFileObservable = (
  path: string,
  data: string,
  encoding: BufferEncoding = 'utf-8',
): Observable<void> => {
  const writeFileAsync = promisify(writeFile);
  return from(writeFileAsync(path, data, encoding));
};
