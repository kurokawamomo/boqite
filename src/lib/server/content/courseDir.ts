import { env } from '$env/dynamic/private';
import { parseCourseDirs } from './externalCourse';

/** 追加コースの置き場（COURSE_DIR）。コロン区切りで複数指定できる。空なら追加コースは読まない */
export function getCourseDirs(): string[] {
	return parseCourseDirs(env.COURSE_DIR ?? '');
}
