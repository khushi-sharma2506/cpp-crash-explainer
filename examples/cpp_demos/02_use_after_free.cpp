#include <iostream>

struct Player {
    int id;
    int score;
};

// Bug: Using a pointer after deleting the object it points to
int main() {
    std::cout << "[Demo] Creating Player object on heap..." << std::endl;
    Player* p = new Player{101, 500};

    std::cout << "[Demo] Deleting Player..." << std::endl;
    delete p;

    std::cout << "[Demo] Accessing deleted player's score..." << std::endl;
    // Trigger heap-use-after-free
    std::cout << "Player Score: " << p->score << std::endl;

    return 0;
}
