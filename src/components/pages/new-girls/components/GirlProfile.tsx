import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { Badge } from '../../../ui/badge';
import { useState } from 'react';

interface Girl {
  id: string; // Changed from number to string to match MongoDB ObjectId
  name: string;
  age: number;
  location: string;
  isOnline: boolean;
  photos: string[];
  tags: string[];
  bio: string;
}

interface GirlProfileProps {
  girl: Girl;
  onClose: () => void;
}

export function GirlProfile({ girl, onClose }: GirlProfileProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const handlePrevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? girl.photos.length - 1 : prev - 1
    );
  };
  
  const handleNextImage = () => {
    setCurrentImageIndex(prev => 
      prev === girl.photos.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-800/50">
        <button onClick={onClose} className="text-white/80">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-white">Profile</h1>
          <p className="text-white/60 text-sm">{girl.name}</p>
        </div>
        <div className="w-6"></div>
      </div>

      {/* Girl Photo Gallery */}
      <div className="flex-1 relative">
        <ImageWithFallback
          src={girl.photos[currentImageIndex]}
          alt={`${girl.name} - Photo ${currentImageIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Image Navigation */}
        {girl.photos.length > 1 && (
          <>
            {/* Previous Image Button */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all duration-200"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            {/* Next Image Button */}
            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all duration-200"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Image Dots Indicator */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {girl.photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'bg-white' 
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Girl Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-8 text-white">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl">{girl.name}</h2>
            <div className={`w-3 h-3 rounded-full ${girl.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-green-400">{girl.isOnline ? 'online' : 'offline'}</span>
          </div>
          
          {/* Basic Info Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-base px-3 py-1">
              {girl.age} years old
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-base px-3 py-1">
              {girl.location}
            </Badge>
          </div>

          {/* Interest Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {girl.tags && girl.tags.length > 0 ? (
              girl.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="bg-white/10 text-white border-white/30 text-base px-3 py-1">
                  {tag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-base px-3 py-1">
                No interests listed
              </Badge>
            )}
          </div>

          {/* Bio */}
          {girl.bio && girl.bio.trim() !== '' && girl.bio !== 'No bio available' && (
            <div className="mb-4">
              <p className="text-white/90 text-sm leading-relaxed">
                {girl.bio}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}