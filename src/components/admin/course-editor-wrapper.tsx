'use client';

import { useRouter } from 'next/navigation';
import { CourseEditor } from './course-editor';

interface CourseEditorWrapperProps {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  initialModules: any[];
}

export function CourseEditorWrapper({
  courseId,
  courseTitle,
  courseSlug,
  initialModules
}: CourseEditorWrapperProps) {
  const router = useRouter();
  
  return (
    <CourseEditor
      courseId={courseId}
      courseTitle={courseTitle}
      courseSlug={courseSlug}
      initialModules={initialModules}
      onBack={() => router.push('/admin')}
    />
  );
}
