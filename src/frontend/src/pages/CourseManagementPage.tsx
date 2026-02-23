import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useGetChannel, useGetChannelCourses } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Plus, Edit } from 'lucide-react';
import CreateCourseDialog from '../components/CreateCourseDialog';
import EditCourseDialog from '../components/EditCourseDialog';
import type { Course } from '../backend';

export default function CourseManagementPage() {
  const { channelId } = useParams({ from: '/channel/$channelId/courses/manage' });
  const { identity } = useAuth();
  const { data: channel, isLoading } = useGetChannel(channelId);
  const { data: courses = [], isLoading: coursesLoading } = useGetChannelCourses(channelId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const isOwner = identity && channel && channel.principal.toString() === identity.getPrincipal().toString();

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!channel || !isOwner) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Manage Courses</h1>
        <p className="text-muted-foreground">{channel.name}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Your Courses
              </CardTitle>
              <CardDescription>Create and manage video courses for your channel</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-24 bg-muted rounded" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No courses yet. Create your first course to organize your videos into structured learning paths!
            </p>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="p-4 border rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{course.videoIds.length} videos</span>
                      {course.priceUsd && <span>${Number(course.priceUsd)}</span>}
                      {course.requiredTierLevel && <span>Tier {Number(course.requiredTierLevel)}+</span>}
                      <span className={course.isVisible ? 'text-green-600' : 'text-muted-foreground'}>
                        {course.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCourse(course)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCourseDialog
        channelId={channelId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {editingCourse && (
        <EditCourseDialog
          course={editingCourse}
          open={!!editingCourse}
          onOpenChange={(open) => !open && setEditingCourse(null)}
        />
      )}
    </div>
  );
}
