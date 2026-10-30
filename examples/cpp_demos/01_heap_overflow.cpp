#include <iostream>

// Bug: Off-by-one error when indexing a dynamically allocated buffer
int main() {
    std::cout << "[Demo] Allocating array of 10 integers (40 bytes)..." << std::endl;
    int* array = new int[10]; // Valid indices: 0 to 9

    for (int i = 0; i < 10; ++i) {
        array[i] = i * 10;
    }

    std::cout << "[Demo] Accessing array[10] (Index out of bounds)..." << std::endl;
    // Trigger heap-buffer-overflow
    int bad_val = array[10];

    std::cout << "Value: " << bad_val << std::endl;
    delete[] array;
    return 0;
}
