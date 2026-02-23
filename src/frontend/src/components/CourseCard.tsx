import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Lock, DollarSign } from 'lucide-react';
import type { Course } from '../backend';

interface CourseCardProps {
  course: Course;
  onSubscribe?: () => void;
}

export default function CourseCard({ course, onSubscribe }: CourseCardProps) {
  const videoCount = course.videoIds.length;
  const hasTierRequirement = course.requiredTierLevel !== undefined && course.requiredTierLevel !== null;
  const hasPriceRequirement = course.priceUsd !== undefined && course.priceUsd !== null;
  const isFree = !hasTierRequirement && !hasPriceRequirement;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
          {hasTierRequirement && (
            <Badge variant="secondary" className="shrink-0">
              <Lock className="h-3 w-3 mr-1" />
              Members
            </Badge>
          )}
          {hasPriceRequirement && (
            <Badge variant="secondary" className="shrink-0">
              <DollarSign className="h-3 w-3 mr-1" />
              ${Number(course.priceUsd)}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {course.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PlayCircle className="h-4 w-4" />
          <span>{videoCount} {videoCount === 1 ? 'video' : 'videos'}</span>
        </div>
      </CardContent>
      <CardFooter>
        {isFree ? (
          <Button asChild className="w-full">
            <Link to="/course/$courseId/play" params={{ courseId: course.id }}>
              Start Course
            </Link>
          </Button>
        ) : hasTierRequirement ? (
          <Button className="w-full" onClick={onSubscribe}>
            Subscribe to Access
          </Button>
        ) : (
          <Button className="w-full" onClick={onSubscribe}>
            Purchase for ${Number(course.priceUsd)}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
