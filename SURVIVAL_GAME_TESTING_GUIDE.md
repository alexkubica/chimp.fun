# 🍌 CHIMP Survival Game - Testing Guide

## 🎮 Overview

The `/game` route has been successfully transformed into a survival game with the following mechanics:

## ✅ Implemented Features

### 1. **Health System**

- **Initial Health**: 3 bananas (displayed as 🍌🍌🍌 in HUD)
- **Health Display**: Visual opacity changes for remaining health
- **Health Sync**: React state and Phaser scene synchronization

### 2. **Obstacle System**

- **Metal Spikes**: SVG-based gray triangular spikes
- **Spawn Rate**: Every 3-5 seconds during gameplay
- **Damage**: -1 health per collision
- **Smart Placement**: Won't spawn within 100 pixels of player
- **Collision Detection**: 40-pixel distance threshold

### 3. **Banana Collectibles**

- **Health Restoration**: +1 health up to maximum of 3
- **Spawn Rate**: Every 8-12 seconds during gameplay
- **Visual Design**: Golden SVG banana graphics
- **Collection Effects**: Green tint + golden confetti

### 4. **Survival Mechanics**

- **Timer**: Counts up from 0 seconds (survival time)
- **Scoring**: 10 points per second of survival
- **Game Over**: Triggered when health reaches 0
- **Invulnerability**: 1-second damage cooldown after being hit

### 5. **Visual Feedback**

- **Damage**: Red tint when hit by spikes
- **Healing**: Green tint when collecting bananas
- **Confetti**: Different effects for various actions
- **Health Display**: 3 banana emojis with opacity states

## 🧪 How to Test

### Starting the Game

1. Visit `/game` route
2. Click "START SURVIVAL" button
3. Read the on-screen instructions:
   - 🍌 Start with 3 bananas (health)
   - ⚠️ Avoid metal spikes!
   - 🍌 Collect bananas to restore health
   - 🏆 Survive as long as possible!

### Testing Health System

1. **Initial State**: Verify 3 banana emojis are visible and opaque
2. **Damage Test**: Let a metal spike hit you
   - Health should decrease by 1
   - One banana should become semi-transparent
   - Chimp should flash red briefly
3. **Healing Test**: Collect a banana from the ground
   - Health should increase by 1 (up to max 3)
   - Chimp should flash green briefly
   - Golden confetti should appear

### Testing Obstacle System

1. **Spawn Rate**: Metal spikes should appear every 3-5 seconds
2. **Collision**: Walk into a spike to test damage
3. **Invulnerability**: Try to get hit again immediately (should be protected for 1 second)
4. **Placement**: Verify spikes don't spawn directly on top of player

### Testing Banana Collectibles

1. **Spawn Rate**: Bananas should appear every 8-12 seconds
2. **Healing**: Collect bananas when health is damaged
3. **Max Health**: Try collecting bananas at full health (should still work but not exceed 3)
4. **Visual Effects**: Verify green tint and golden confetti

### Testing Timer & Scoring

1. **Timer Display**: Should count up from 0.0s
2. **Score Calculation**: Points should increase by 10 per second
3. **Real-time Display**: Bottom display shows "X POINTS • Y.Ys"
4. **Game Over**: When health reaches 0, game should end with big confetti

### Testing Game Over

1. **Health Depletion**: Let health reach 0 by getting hit by spikes
2. **Game Over Screen**: Should show survival time and final score
3. **Social Sharing**: Tweet button should mention survival time and score
4. **Restart**: "PLAY AGAIN" button should reset everything

## 🎯 Key Testing Scenarios

### Scenario 1: Quick Death

- Start game
- Immediately run into 3 spikes
- Verify game over triggers correctly

### Scenario 2: Balanced Gameplay

- Start game
- Avoid some spikes, get hit by others
- Collect bananas to restore health
- Verify health management works properly

### Scenario 3: Long Survival

- Start game
- Play for 30+ seconds
- Verify continuous spawning of obstacles and bananas
- Check scoring accuracy (should be ~300+ points for 30 seconds)

### Scenario 4: Edge Cases

- Test boundary collisions
- Test multiple simultaneous collisions
- Test collecting bananas at full health
- Test game over during invulnerability period

## 🔧 Technical Implementation Details

### React State Management

- `health` state synchronized with Phaser scene
- Timer updates using `requestAnimationFrame`
- Real-time score calculation based on survival time

### Phaser Game Objects

- `obstacles`: Phaser Group for managing multiple spikes
- `bananas`: Phaser Group for managing multiple collectibles
- Distance-based collision detection (40px threshold)

### Asset Loading

- SVG-based graphics for spikes and bananas
- Base64-encoded inline SVG for immediate loading
- No external asset dependencies

### Performance Considerations

- Groups for efficient collision detection
- Proper cleanup when game ends
- Optimized spawning timers

## 🐛 Common Issues & Solutions

### Issue: Spikes/Bananas Not Spawning

- **Solution**: Verify game status is "running"
- **Check**: Timer variables are properly reset

### Issue: Health Not Updating

- **Solution**: Ensure React state sync is working
- **Check**: Health synchronization interval (100ms)

### Issue: Collision Detection Problems

- **Solution**: Verify distance calculation
- **Check**: Collision threshold (40px)

### Issue: Game Not Ending

- **Solution**: Check health depletion logic
- **Check**: Game status change to "finished"

## 🎮 Controls

- **Desktop**: Arrow keys or WASD
- **Mobile**: Touch to move
- **Settings**: Cog icon for game options

## 📱 Mobile Compatibility

- Touch controls fully supported
- Responsive UI elements
- Proper scaling for different screen sizes

## 🎯 Success Criteria

✅ Game starts with 3 health
✅ Spikes spawn and damage player
✅ Bananas spawn and heal player
✅ Timer counts up from 0
✅ Score increases with survival time
✅ Game ends when health reaches 0
✅ Visual feedback for all actions
✅ Mobile and desktop controls work
✅ Social sharing includes survival stats

The survival game mechanics have been successfully implemented and are ready for testing!
