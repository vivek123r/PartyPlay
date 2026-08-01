import React from 'react';
import type { Character } from '@games/run-and-gun/types';

interface Props {
  character: Character;
  size?: 'sm' | 'md';
}

export const SoldierPortrait: React.FC<Props> = ({ character, size = 'md' }) => {
  const isSm = size === 'sm';
  const width = isSm ? 36 : 48;
  const height = isSm ? 48 : 64;

  return (
    <div
      className="rg-char-portrait"
      style={{
        width,
        height,
        backgroundColor: '#0f0e17',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      aria-label={`${character.name} portrait`}
    >
      <div
        style={{
          position: 'relative',
          width: width * 0.75,
          height: height * 0.8,
        }}
      >
        {/* Headgear & Armor Overlays */}
        <HeadgearOverlay characterId={character.id} color={character.color} />
        {/* Visor */}
        <VisorOverlay characterId={character.id} color={character.color} />
        {/* Body / Torso */}
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: '12%',
            width: '76%',
            height: '28%',
            backgroundColor: character.color,
            border: '2px solid #fffffe',
            boxShadow: 'inset 0 -3px 0 #000, 2px 0 0 #1f1e2e',
          }}
        />
        {/* Class Chest Accents */}
        <ChestAccentOverlay characterId={character.id} />
        {/* Belt */}
        <div
          style={{
            position: 'absolute',
            top: '62%',
            left: '12%',
            width: '76%',
            height: '5%',
            backgroundColor: '#1f1e2e',
            borderTop: '2px solid #fffffe',
            borderBottom: '2px solid #fffffe',
          }}
        />
        {/* Legs */}
        <div
          style={{
            position: 'absolute',
            top: '68%',
            left: '20%',
            width: '22%',
            height: '30%',
            backgroundColor: '#2a3c2a',
            border: '2px solid #fffffe',
            borderTop: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '68%',
            right: '20%',
            width: '22%',
            height: '30%',
            backgroundColor: '#2a3c2a',
            border: '2px solid #fffffe',
            borderTop: 'none',
          }}
        />
        {/* Weapon — varies by character */}
        <WeaponOverlay characterId={character.id} color={character.color} />
      </div>
    </div>
  );
};

const HeadgearOverlay: React.FC<{ characterId: string; color: string }> = ({ characterId, color }) => {
  if (characterId === 'commando') {
    // Red bandana + trailing tail
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '80%',
            height: '18%',
            backgroundColor: '#ff2e63',
            border: '2px solid #fffffe',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '12%',
            left: '-10%',
            width: '20%',
            height: '12%',
            backgroundColor: '#ff2e63',
            border: '1px solid #fffffe',
          }}
        />
      </>
    );
  }
  if (characterId === 'heavy') {
    // Massive pauldrons + helmet crest
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: '6%',
            left: '15%',
            width: '70%',
            height: '28%',
            backgroundColor: color,
            border: '2px solid #fffffe',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '32%',
            left: '2%',
            width: '25%',
            height: '20%',
            backgroundColor: '#2a5530',
            border: '2px solid #fffffe',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '32%',
            right: '2%',
            width: '25%',
            height: '20%',
            backgroundColor: '#2a5530',
            border: '2px solid #fffffe',
          }}
        />
      </>
    );
  }
  if (characterId === 'scout') {
    // Recon hood
    return (
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '12%',
          width: '76%',
          height: '26%',
          backgroundColor: color,
          border: '2px solid #fffffe',
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '70%',
        height: '25%',
        backgroundColor: color,
        border: '2px solid #fffffe',
        boxShadow: 'inset 0 -2px 0 #000',
      }}
    />
  );
};

const VisorOverlay: React.FC<{ characterId: string; color: string }> = ({ characterId }) => {
  let visorBg = '#0f0e17';
  if (characterId === 'scout') visorBg = '#08d9d6';
  else if (characterId === 'heavy') visorBg = '#ffff44';
  else if (characterId === 'infiltrator') visorBg = '#bb99ff';

  return (
    <div
      style={{
        position: 'absolute',
        top: '18%',
        left: '30%',
        width: '40%',
        height: '8%',
        backgroundColor: visorBg,
        border: '1px solid #fffffe',
      }}
    />
  );
};

const ChestAccentOverlay: React.FC<{ characterId: string }> = ({ characterId }) => {
  if (characterId === 'commando') {
    // Dual diagonal bandoliers
    return (
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '25%',
          width: '50%',
          height: '20%',
          borderLeft: '3px solid #884422',
          borderRight: '3px solid #884422',
        }}
      />
    );
  }
  if (characterId === 'demolition') {
    // Grenade pouches
    return (
      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: '20%',
          width: '60%',
          height: '14%',
          backgroundColor: '#ffde7d',
          border: '1px solid #000',
        }}
      />
    );
  }
  return null;
};

const WeaponOverlay: React.FC<{
  characterId: string;
  color: string;
}> = ({ characterId, color }) => {
  switch (characterId) {
    case 'commando':
      // Rifle pointing right
      return (
        <div
          style={{
            position: 'absolute',
            top: '42%',
            right: '-20%',
            width: '35%',
            height: '6%',
            backgroundColor: '#a7a9be',
            border: '1px solid #fffffe',
          }}
        />
      );
    case 'scout':
      // SMG angled up
      return (
        <div
          style={{
            position: 'absolute',
            top: '30%',
            right: '-15%',
            width: '28%',
            height: '5%',
            backgroundColor: '#a7a9be',
            border: '1px solid #fffffe',
            transform: 'rotate(-20deg)',
            transformOrigin: 'left center',
          }}
        />
      );
    case 'heavy':
      // Large weapon barrel
      return (
        <>
          <div
            style={{
              position: 'absolute',
              top: '38%',
              right: '-30%',
              width: '45%',
              height: '8%',
              backgroundColor: '#a7a9be',
              border: '1px solid #fffffe',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '36%',
              right: '-28%',
              width: '10%',
              height: '12%',
              backgroundColor: color,
              border: '1px solid #fffffe',
            }}
          />
        </>
      );
    case 'demolition':
      // Grenade launcher — wider barrel
      return (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            right: '-25%',
            width: '38%',
            height: '8%',
            backgroundColor: '#a7a9be',
            border: '1px solid #fffffe',
            boxShadow: '0 -2px 0 #a7a9be',
          }}
        />
      );
    case 'infiltrator':
      // Silenced pistol
      return (
        <div
          style={{
            position: 'absolute',
            top: '44%',
            right: '-30%',
            width: '42%',
            height: '4%',
            backgroundColor: '#1f1e2e',
            border: '1px solid #fffffe',
          }}
        />
      );
    case 'vanguard':
      // Shotgun — short but wide
      return (
        <>
          <div
            style={{
              position: 'absolute',
              top: '40%',
              right: '-18%',
              width: '28%',
              height: '7%',
              backgroundColor: '#a7a9be',
              border: '1px solid #fffffe',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '36%',
              right: '-22%',
              width: '8%',
              height: '15%',
              backgroundColor: '#1f1e2e',
              border: '1px solid #fffffe',
            }}
          />
        </>
      );
    default:
      return null;
  }
};
