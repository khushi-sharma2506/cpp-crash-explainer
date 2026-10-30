#include <iostream>

void fill_buffer() {
    int local_buf[5]; // local stack buffer: indices 0 to 4

    std::cout << "[Demo] Writing into local stack buffer..." << std::endl;
    for (int i = 0; i <= 6; ++i) { // Bug: writes up to index 6
        local_buf[i] = i * 100;
    }
}

int main() {
    fill_buffer();
    return 0;
}
