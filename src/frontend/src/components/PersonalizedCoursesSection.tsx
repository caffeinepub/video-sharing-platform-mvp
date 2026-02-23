import { useGetPersonalizedCourses } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Sparkles } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function PersonalizedCoursesSection() {
  const { isAuthenticated } = useAuth();
  const { data: courses = [], isLoading } = useGetPersonalizedCourses();

  if (!isAuthenticated) {
    return (
      <section className="mb-12">
        <Card className="border-2 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Discover Your Learning Path</h2>
            <p className="text-muted-foreground mb-6">
              Log in to get personalized course recommendations based on your interests and activity
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Curated For You</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Curated For You</h2>
        </div>
        <Card className="border-2 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Recommendations Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start watching videos, liking content, and following channels to get personalized course recommendations!
            </p>
            <Button asChild>
              <Link to="/">Explore Videos</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Curated For You</h2>
        <p className="text-muted-foreground ml-2">Based on your activity and interests</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.map((course) => (
          <Link
            key={course.id}
            to="/course/$courseId/play"
            params={{ courseId: course.id }}
            className="group"
          >
            <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
                {course.courseImage ? (
                  <img
                    src={course.courseImage}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <GraduationCap className="h-16 w-16 text-primary/40" />
                )}
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                  {course.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{course.videoIds.length} videos</span>
                  {course.priceUsd ? (
                    <span className="font-semibold text-primary">${Number(course.priceUsd)}</span>
                  ) : (
                    <span className="font-semibold text-green-600">Free</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
