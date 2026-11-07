#include <algorithm>
#include <cmath>
#include <cstdint>

namespace {
struct Rect { float x, y, w, h; };
constexpr int kMaxSolids = 128;
constexpr float kPlayerW = 26.0f;
constexpr float kPlayerH = 38.0f;
constexpr float kAcceleration = 1850.0f;
constexpr float kFriction = 2200.0f;
constexpr float kMaxSpeed = 285.0f;
constexpr float kGravity = 1550.0f;
constexpr float kJumpVelocity = 565.0f;
constexpr float kJumpCut = 0.48f;
constexpr float kCoyoteTime = 0.105f;
constexpr float kJumpBuffer = 0.13f;
Rect solids[kMaxSolids]{};
int solidCount = 0;
float px = 80, py = 390, vx = 0, vy = 0;
float checkpointX = 80, checkpointY = 390;
float coyote = 0, jumpBuffer = 0;
bool grounded = false, jumpWasHeld = false;
int respawnCount = 0;
bool intersects(float ax, float ay, float aw, float ah, const Rect& b) {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}
void respawn() {
  px = checkpointX; py = checkpointY; vx = 0; vy = 0;
  grounded = false; coyote = 0; jumpBuffer = 0; jumpWasHeld = false;
  ++respawnCount;
}
}

extern "C" {
void reset_player() { px = checkpointX = 80; py = checkpointY = 390; vx = vy = 0; grounded = false; coyote = jumpBuffer = 0; respawnCount = 0; }
void clear_solids() { solidCount = 0; }
void add_solid(float x, float y, float w, float h) { if (solidCount < kMaxSolids && w > 0 && h > 0) solids[solidCount++] = {x, y, w, h}; }
void set_checkpoint(float x, float y) { checkpointX = x; checkpointY = y; }
void move_player(float axis, int jumpPressed, int jumpHeld, float dt) {
  dt = std::clamp(dt, 0.0f, 0.033f);
  axis = std::clamp(axis, -1.0f, 1.0f);
  if (jumpPressed) jumpBuffer = kJumpBuffer; else jumpBuffer = std::max(0.0f, jumpBuffer - dt);
  if (grounded) coyote = kCoyoteTime; else coyote = std::max(0.0f, coyote - dt);
  if (axis != 0) vx += axis * kAcceleration * dt;
  else { const float drag = kFriction * dt; vx = std::abs(vx) <= drag ? 0 : vx - std::copysign(drag, vx); }
  vx = std::clamp(vx, -kMaxSpeed, kMaxSpeed);
  if (jumpBuffer > 0 && coyote > 0) { vy = -kJumpVelocity; grounded = false; coyote = 0; jumpBuffer = 0; }
  if (jumpWasHeld && !jumpHeld && vy < 0) vy *= kJumpCut;
  jumpWasHeld = jumpHeld != 0;
  vy = std::min(vy + kGravity * dt, 900.0f);

  px += vx * dt;
  for (int i = 0; i < solidCount; ++i) if (intersects(px, py, kPlayerW, kPlayerH, solids[i])) {
    if (vx > 0) px = solids[i].x - kPlayerW; else if (vx < 0) px = solids[i].x + solids[i].w;
    vx = 0;
  }
  py += vy * dt; grounded = false;
  for (int i = 0; i < solidCount; ++i) if (intersects(px, py, kPlayerW, kPlayerH, solids[i])) {
    if (vy > 0) { py = solids[i].y - kPlayerH; grounded = true; coyote = kCoyoteTime; }
    else if (vy < 0) py = solids[i].y + solids[i].h;
    vy = 0;
  }
  if (py > 720) respawn();
}
void hurt_player() { respawn(); }
float player_x() { return px; }
float player_y() { return py; }
float player_vx() { return vx; }
float player_vy() { return vy; }
float player_width() { return kPlayerW; }
float player_height() { return kPlayerH; }
int player_grounded() { return grounded ? 1 : 0; }
int respawn_count() { return respawnCount; }
}
