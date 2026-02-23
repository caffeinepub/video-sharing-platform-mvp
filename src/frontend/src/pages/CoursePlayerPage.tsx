import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useGetCourse, useGetChannel } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Edit } from 'lucide-react';
import EditCourseDialog from '../components/EditCourseDialog';

export default function CoursePlayerPage() {
  const { courseId } = useParams({ from: '/course/$courseId/play' });
  const { identity } = useAuth();
  const { data: course, isLoading } = useGetCourse(courseId);
  const { data: channel } = useGetChannel(course?.channelId);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isOwner = identity && channel && channel.principal.toString() === identity.getPrincipal().toString();

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
          <p className="text-muted-foreground">This course doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {course.title}
            </CardTitle>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Course
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{course.description}</p>
          <p className="text-sm text-muted-foreground mt-4">
            {course.videoIds.length} videos in this course
          </p>
        </CardContent>
      </Card>

      {course && (
        <EditCourseDialog
          course={course}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </div>
  );
}
