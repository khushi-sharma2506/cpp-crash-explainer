#include <iostream>

struct Config {
    int port;
};

// Returns nullptr to simulate a lookup failure
Config* find_config(bool found) {
    if (!found) {
        return nullptr;
    }
    return new Config{8080};
}

int main() {
    std::cout << "[Demo] Searching for configuration..." << std::endl;
    Config* cfg = find_config(false); // Returns nullptr

    std::cout << "[Demo] Attempting to read port from null pointer..." << std::endl;
    // Trigger Null pointer dereference (SEGV on 0x0)
    std::cout << "Server port: " << cfg->port << std::endl;

    return 0;
}
