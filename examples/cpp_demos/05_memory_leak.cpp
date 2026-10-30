#include <iostream>

void create_session() {
    std::cout << "[Demo] Allocating memory inside function..." << std::endl;
    int* session_token = new int[25]; // 100 bytes allocated on heap
    session_token[0] = 9999;
    
    // Bug: function exits without delete[] session_token
}

int main() {
    create_session();
    std::cout << "[Demo] Function returned without releasing allocated buffer." << std::endl;
    return 0; // Trigger LeakSanitizer report on exit
}
