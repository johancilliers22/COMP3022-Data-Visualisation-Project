import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, Form, Badge } from 'react-bootstrap';
import { SkipStart, Play, Pause, SkipEnd, Calendar2Event } from 'react-bootstrap-icons';
import { useUI } from '../../App';
import './TimeControls.css';

// Key timestamp events in the disaster timeline
export const KEY_EVENTS = [
  { time: new Date('2020-04-06 14:40:00').getTime(), label: 'First Reports' },
  { time: new Date('2020-04-08 08:35:00').getTime(), label: 'First Quake' },
  { time: new Date('2020-04-08 18:00:00').getTime(), label: 'Power Outages' },
  { time: new Date('2020-04-09 15:00:00').getTime(), label: 'Second Quake' },
  { time: new Date('2020-04-10 06:00:00').getTime(), label: 'Recovery Starts' }
];

/**
 * TimeControls component for controlling the earthquake timeline
 */
const TimeControls = () => {
  const { currentTime, setCurrentTime } = useUI();
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPlayingRef = useRef(false); // Add ref to track current playing state
  
  // Update ref whenever state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  // Timeline range - hardcoded to match the data
  const timeRange = useMemo(() => [
    new Date('2020-04-06').getTime(),
    new Date('2020-04-10 23:59:59').getTime()
  ], []);
  
  // Calculate time step size (in milliseconds)
  const timeStepSize = useMemo(() => 
    2 * 60 * 1000 * (isPlaying ? 1 : 0), 
  [isPlaying]);
  
  // Calculate slider step size - 10 minute increments for finer control
  const sliderStepSize = useMemo(() => 
    10 * 60 * 1000, 
  []);
  
  // Format time for display
  const formatTime = (time) => {
    const date = new Date(time);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Handle play/pause button
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Handle slider change
  const handleSliderChange = useCallback((e) => {
    // Stop any ongoing animation immediately
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    const value = parseInt(e.target.value);
    setCurrentTime(value);
    lastUpdateTimeRef.current = performance.now();
  }, [setCurrentTime]);
  
  // Handler for when user starts dragging the slider
  const handleSliderMouseDown = useCallback(() => {
    isDraggingRef.current = true;
    
    // Always pause during dragging
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);
  
  // Handler for when user stops dragging the slider
  const handleSliderMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    
    // If we were playing before, resume
    if (isPlayingRef.current && !animationRef.current) {
      lastUpdateTimeRef.current = performance.now();
      startAnimation();
    }
  }, []);
  
  // Jump to start
  const jumpToStart = useCallback(() => {
    // Stop any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setCurrentTime(timeRange[0]);
    lastUpdateTimeRef.current = performance.now();
    
    // Resume animation if we were playing
    if (isPlayingRef.current) {
      requestAnimationFrame(animate);
    }
  }, [timeRange, setCurrentTime]);

  // Jump to end
  const jumpToEnd = useCallback(() => {
    // Always stop animation when jumping to end
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setCurrentTime(timeRange[1]);
    
    // Always pause when reaching the end
    setIsPlaying(false);
  }, [timeRange, setCurrentTime]);
  
  // Jump to a key event
  const jumpToEvent = useCallback((time) => {
    // Stop any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setCurrentTime(time);
    lastUpdateTimeRef.current = performance.now();
    
    // Do not auto-start playback when jumping to an event
  }, [setCurrentTime]);
  
  // Toggle playback speed
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const toggleSpeed = useCallback(() => {
    setPlaybackSpeed(prevSpeed => {
      if (prevSpeed === 1) return 2;
      if (prevSpeed === 2) return 4;
      return 1;
    });
  }, []);

  // Animation function
  const animate = useCallback(() => {
    // Clear the animation frame reference
    animationRef.current = null;
    
    // Get current state from refs to avoid closure issues
    const isDragging = isDraggingRef.current;
    const isCurrentlyPlaying = isPlayingRef.current;
    
    // Prevent animation if dragging or not playing
    if (isDragging || !isCurrentlyPlaying) {
      return;
    }
    
    // Calculate time since last update
    const now = performance.now();
    const elapsed = now - lastUpdateTimeRef.current;
    
    // Update every 200ms - slow enough to allow for smooth data loading
    if (elapsed > 200) {
      lastUpdateTimeRef.current = now;
      
      setCurrentTime(prev => {
        // Calculate next time based on playback speed
        const increment = 2 * 60 * 1000 * playbackSpeed; // 2 min × speed
        const next = prev + increment;
        
        // Check if we've reached the end
        if (next >= timeRange[1]) {
          // Use requestAnimationFrame to make sure UI updates first
          requestAnimationFrame(() => {
            setIsPlaying(false);
          });
          return timeRange[1];
        }
        
        return next;
      });
    }
    
    // Continue animation loop only if still playing
    if (isCurrentlyPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [setCurrentTime, timeRange, playbackSpeed]);
  
  // Helper function to start animation
  const startAnimation = useCallback(() => {
    if (!animationRef.current && !isDraggingRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  // Effect to handle animation play/pause
  useEffect(() => {
    if (isPlaying) {
      startAnimation();
    } else if (animationRef.current) {
      // Cancel animation when paused
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, startAnimation]);
  
  // Find if current time is close to a key event
  const nearestEvent = useMemo(() => {
    if (!currentTime) return null;
    
    // Find event within 2 hours
    const twoHoursMs = 2 * 60 * 60 * 1000;
    
    return KEY_EVENTS.find(event => 
      Math.abs(event.time - currentTime) < twoHoursMs
    );
  }, [currentTime]);
  
  // Calculate current timeline progress percentage
  const timelineProgress = useMemo(() => {
    if (!timeRange || !currentTime) return 0;
    const totalDuration = timeRange[1] - timeRange[0];
    const currentProgress = currentTime - timeRange[0];
    return Math.floor((currentProgress / totalDuration) * 100);
  }, [currentTime, timeRange]);

  return (
    <div className="timeline-controls">
      <div className="timeline-header">
        <div className="current-time">
          <span className="time-label">Current Time:</span> {formatTime(currentTime)}
          <span className="progress-text">Progress: {timelineProgress}%</span>
          {nearestEvent && (
            <Badge bg="info" className="event-badge">
              <Calendar2Event /> {nearestEvent.label}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="timeline-body">
        <div className="time-range">
          <span className="time-start">{formatTime(timeRange[0])}</span>
          <div className="time-slider-container">
            <Form.Range
              min={timeRange[0]}
              max={timeRange[1]}
              step={sliderStepSize}
              value={currentTime}
              onChange={handleSliderChange}
              onMouseDown={handleSliderMouseDown}
              onMouseUp={handleSliderMouseUp}
              onTouchStart={handleSliderMouseDown}
              onTouchEnd={handleSliderMouseUp}
              className="time-slider"
              aria-label="Timeline slider"
            />
          </div>
          <span className="time-end">{formatTime(timeRange[1])}</span>
        </div>
        
        <div className="timeline-controls-row">
          <div className="control-buttons">
            <Button variant="outline-secondary" size="sm" onClick={jumpToStart} title="Jump to Start">
              <SkipStart />
            </Button>
            <Button variant="primary" size="sm" onClick={handlePlayPause} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={jumpToEnd} title="Jump to End">
              <SkipEnd />
            </Button>
            <Button 
              variant="outline-info" 
              size="sm" 
              onClick={toggleSpeed} 
              className="speed-button"
              title="Change Playback Speed"
            >
              {playbackSpeed}x
            </Button>
          </div>
          
          <div className="events-buttons">
            {KEY_EVENTS.map((event, index) => (
              <Button 
                key={index} 
                size="sm" 
                variant={nearestEvent?.time === event.time ? 'info' : 'outline-info'}
                className="event-button"
                onClick={() => jumpToEvent(event.time)}
              >
                {event.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeControls; 